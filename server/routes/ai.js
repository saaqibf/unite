const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const { auth } = require('../middleware/auth');

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Locally-sourced fallback advice from UCalgary program data — used when API credits run out
function localFallbackAdvice(program, year, message) {
  let programs;
  try { programs = require(path.join(__dirname, '../../data/ucalgary_programs.json')).programs; } catch { programs = []; }

  const msg = (message || '').toLowerCase();
  const progData = programs.find(p => {
    const name = (p.name || '').toLowerCase();
    const prog = (program || '').toLowerCase();
    return name.includes(prog) || prog.includes(p.key);
  }) || programs[0];

  const yr = parseInt((year || 'Year 1').replace(/\D/g, '')) || 1;
  const coreCourses = progData ? (progData.core_required || []).slice(0, 10) : [];
  const genReqsRaw = progData ? (progData.general_requirements || {}) : {};
  const genReqs = Array.isArray(genReqsRaw) ? genReqsRaw : Object.values(genReqsRaw).map(v => typeof v === 'string' ? v : JSON.stringify(v));

  if (msg.includes('gpa') || msg.includes('grade')) {
    return `At UCalgary, GPA is calculated on a 4.0 scale: A=4.0, A-=3.7, B+=3.3, B=3.0, B-=2.7, C+=2.3, C=2.0. You need a minimum 2.0 GPA to maintain good standing. For most scholarships you need 3.0+. I recommend using the GPA Simulator tab to track your standing.`;
  }

  if (msg.includes('prereq') || msg.includes('prerequisite')) {
    const firstTwo = coreCourses.slice(0, 2);
    return `For ${progData ? progData.name : program} at UCalgary, make sure you complete prerequisites in order. Key foundational courses are ${firstTwo.join(' and ')}. Check the Prereq Tree tab for a visual chain of all requirements. The general rule: complete lower-numbered courses (200-level) before 300-level, and 300-level before 400-level courses.`;
  }

  const yearCourses = coreCourses.slice((yr - 1) * 5, yr * 5).length > 0
    ? coreCourses.slice((yr - 1) * 5, yr * 5)
    : coreCourses.slice(0, 5);

  return `For **${progData ? progData.name : (program || 'your program')}** in Year ${yr} at UCalgary, I recommend focusing on these core courses: **${yearCourses.join('**, **')}**.\n\nGeneral requirements to keep in mind: ${genReqs.slice(0, 2).join('; ') || 'complete 120 credit hours total with a minimum 2.0 GPA'}.\n\nTip: Register early — popular courses like ${yearCourses[0] || 'CPSC 217'} fill up fast. Use the Roadmap tab to see your full semester-by-semester plan.`;
}

// The UCalgary-specific system prompt that makes the AI advisor understand our campus and courses
const UCALGARY_ADVISOR_PROMPT = `You are an academic advisor for the University of Calgary. You help students 
plan their degree, understand prerequisites, and make smart course choices. 
You know UCalgary's course catalog, grading system, and program requirements. 
Be friendly, specific, and always refer to UCalgary course codes (e.g. CPSC 331, 
MATH 271). When a student asks what to take next, check their transcript first 
and give concrete recommendations based on what they have completed.

UCalgary grading scale: A=4.0, A-=3.7, B+=3.3, B=3.0, B-=2.7, C+=2.3, C=2.0, C-=1.7, D+=1.3, D=1.0, F=0.

Common UCalgary course codes: CPSC (Computer Science), ENGG (Engineering), SENG (Software Engineering),
MATH (Mathematics), PHYS (Physics), CHEM (Chemistry), BIOL (Biology), PSYC (Psychology),
ACCT (Accounting), NURS (Nursing), KNES (Kinesiology), STAT (Statistics), DATA (Data Science).

Keep responses concise and actionable. Format course codes in bold when mentioned.`;

// Sends a student message to Claude and streams back the AI advisor response
router.post('/chat', auth, async (req, res) => {
  try {
    const { message, transcript, program, year } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // Build context from the student's profile so the AI gives personalized advice
    let contextPrefix = '';
    if (program || year || transcript) {
      contextPrefix = 'Student context:\n';
      if (program) contextPrefix += `- Program: ${program}\n`;
      if (year) contextPrefix += `- Year: ${year}\n`;
      if (transcript && transcript.length > 0) {
        contextPrefix += `- Completed courses: ${Array.isArray(transcript) ? transcript.join(', ') : transcript}\n`;
      }
      contextPrefix += '\nStudent question: ';
    }

    const fullMessage = contextPrefix + message;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: UCALGARY_ADVISOR_PROMPT,
      messages: [{ role: 'user', content: fullMessage }]
    });

    const reply = response.content[0].text;

    res.json({ reply });
  } catch (err) {
    console.error('AI chat error:', err.message);
    // If Anthropic API is unavailable (credits, network), use local UCalgary data to respond
    const { program, year, message } = req.body;
    const fallback = localFallbackAdvice(program, year, message);
    res.json({ reply: fallback, fallback: true });
  }
});

// Generates a full semester-by-semester degree roadmap based on completed courses and program
router.post('/roadmap', auth, async (req, res) => {
  try {
    const { program, year, completed_courses } = req.body;

    if (!program) {
      return res.status(400).json({ error: 'Program is required to generate a roadmap.' });
    }

    const prompt = `Generate a semester-by-semester degree roadmap for a UCalgary student.
Program: ${program}
Current year: ${year || 'Year 1'}
Completed courses: ${completed_courses && completed_courses.length > 0 ? completed_courses.join(', ') : 'None yet'}

Return a JSON object with this structure:
{
  "semesters": [
    {
      "label": "Fall 2026",
      "courses": [
        { "code": "CPSC 217", "name": "Introduction to Computer Science for Multidisciplinary Studies", "units": 3, "note": "Start here" }
      ]
    }
  ],
  "needed_next": ["CPSC 217", "MATH 211"],
  "total_units_remaining": 90
}

Only return valid JSON, no extra text.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: UCALGARY_ADVISOR_PROMPT,
      messages: [{ role: 'user', content: prompt }]
    });

    let roadmap;
    try {
      const raw = response.content[0].text;
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      roadmap = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      return res.status(500).json({ error: 'Could not parse roadmap. Please try again.' });
    }

    res.json({ roadmap });
  } catch (err) {
    console.error('Roadmap error:', err.message);
    // Fallback: return a static roadmap from ucalgary_programs.json
    try {
      const { program, year } = req.body;
      const programs = require(path.join(__dirname, '../../data/ucalgary_programs.json')).programs;
      const prog = programs.find(p => (p.name || '').toLowerCase().includes((program || '').toLowerCase())) || programs[0];
      const core = prog ? (prog.core_required || []) : ['CPSC 217', 'MATH 211', 'CPSC 231', 'MATH 271'];
      const semesters = [];
      for (let i = 0; i < core.length; i += 5) {
        semesters.push({
          label: i === 0 ? 'Fall 2026' : i === 5 ? 'Winter 2027' : `Semester ${Math.floor(i/5)+1}`,
          courses: core.slice(i, i+5).map(code => ({ code, name: code, units: 3, note: '' }))
        });
      }
      res.json({ roadmap: { semesters, needed_next: core.slice(0, 3), total_units_remaining: 90 }, fallback: true });
    } catch {
      res.status(500).json({ error: 'Could not generate roadmap. Please try again.' });
    }
  }
});

module.exports = router;
