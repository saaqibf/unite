const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { auth } = require('../middleware/auth');

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
    console.error('AI chat error:', err);
    res.status(500).json({ error: 'AI advisor is unavailable. Please try again.' });
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
    console.error('Roadmap error:', err);
    res.status(500).json({ error: 'Could not generate roadmap. Please try again.' });
  }
});

module.exports = router;
