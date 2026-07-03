/**
 * Simple NLP parser for voice transcripts on the server side.
 * Extracts title, date, and time from natural language strings.
 */

function parseDateTime(text) {
  const now = new Date();
  let date = null;
  let time = null;

  const lower = text.toLowerCase();

  // Date patterns
  const todayMatch = /\btoday\b/i.exec(lower);
  const tomorrowMatch = /\btomorrow\b/i.exec(lower);
  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

  if (todayMatch) {
    date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (tomorrowMatch) {
    const t = new Date(now);
    t.setDate(t.getDate() + 1);
    date = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  } else if (/\bnext\s+week\b/i.test(lower)) {
    const t = new Date(now);
    t.setDate(t.getDate() + (7 - t.getDay()));
    date = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  } else {
    for (let i = 0; i < dayNames.length; i++) {
      if (lower.includes(dayNames[i])) {
        const today = now.getDay();
        let diff = i - today;
        if (diff <= 0) diff += 7;
        const t = new Date(now);
        t.setDate(t.getDate() + diff);
        date = new Date(t.getFullYear(), t.getMonth(), t.getDate());
        break;
      }
    }
  }

  // Time patterns
  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const period = timeMatch[3].toLowerCase();
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    time = { hours, minutes };
  }

  return { date, time };
}

function extractTitle(text) {
  let cleaned = text.trim();

  const removePhrases = [
    /schedule\s+(a\s+)?(meeting|call|event)\s+/i,
    /create\s+(a\s+)?(meeting|call|event)\s+/i,
    /set\s+(up\s+)?(a\s+)?(meeting|call|event)\s+/i,
    /remind\s+me\s+(to\s+)?/i,
    /add\s+(a\s+)?(meeting|call|event)\s+/i,
    /new\s+(meeting|call|event)\s+/i,
    /let's\s+/i,
    /i\s+(want\s+(to\s+)?)?/i,
    /please\s+/i,
    /can\s+(you\s+)?/i,
    /could\s+(you\s+)?/i,
  ];
  for (const pattern of removePhrases) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Remove date/time references
  cleaned = cleaned
    .replace(/\b(today|tomorrow|next\s+week)\b/gi, '')
    .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, '')
    .replace(/\d{1,2}(?::\d{2})?\s*(am|pm)\b/gi, '')
    .replace(/\bat\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned || text.trim();
}

exports.parseTranscript = async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ message: 'Transcript is required.' });
    }

    const title = extractTitle(transcript);
    const { date, time } = parseDateTime(transcript);

    let dateTime = null;
    if (date) {
      dateTime = new Date(date);
      if (time) {
        dateTime.setHours(time.hours, time.minutes, 0, 0);
      } else {
        dateTime.setHours(9, 0, 0, 0); // default 9 AM
      }
    }

    return res.json({
      title,
      dateTime: dateTime ? dateTime.toISOString() : null,
      source: 'voice',
    });
  } catch (err) {
    console.error('parseTranscript error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};
