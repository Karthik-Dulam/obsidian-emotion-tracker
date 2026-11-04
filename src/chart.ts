export interface Family {
  name: string;
  action: string;
  color: string;
  emotions: string[];
}

// Transcribed from the Therapy in a Nutshell emotion chart (inner ring first, then outer ring).
export const CHART: Family[] = [
  {
    name: "Joy",
    action: "Rejoice - Remember",
    color: "#E83A3A",
    emotions: ["Hopeful", "Spontaneous", "Grateful", "Cheerful", "Uplifted", "Playful",
      "Silly", "Amazed", "Delighted", "Optimistic", "Elated", "Appreciation"],
  },
  {
    name: "Sadness",
    action: "Change course - Honor",
    color: "#F06A3B",
    emotions: ["Lost", "Fake", "Pessimistic", "Worthless", "Discouraged", "Hopeless",
      "Insecure", "Self-Conscious", "Disappointed", "Depressed", "Confused",
      "Despair", "Heavy", "Defeated"],
  },
  {
    name: "Genius",
    action: "Create - Take risks",
    color: "#F0A02A",
    emotions: ["Inspired", "In awe", "Interested", "Focused", "Creative", "Passionate",
      "Challenged", "Curious", "Brave", "In flow", "Manic", "Authentic"],
  },
  {
    name: "Excitement",
    action: "Take action - Perform",
    color: "#036B3A",
    emotions: ["Energetic", "Surprised", "Purposeful", "Proud", "Rigid", "Distracted",
      "Bored", "Apathetic", "Inspired", "Confident", "Aggressive", "Stressed"],
  },
  {
    name: "Regret",
    action: "Make repairs - Get clarity",
    color: "#17898F",
    emotions: ["Guilty", "Hurt", "Courageous", "Willing", "Ashamed", "Heartbroken",
      "Tired", "Burnt out", "Uncertain", "Numb", "Confused", "Overwhelmed"],
  },
  {
    name: "Anger",
    action: "Protect - Be accountable",
    color: "#054A73",
    emotions: ["Defensive", "Fuming", "Bitter", "Frustrated", "Furious", "Terrified",
      "Shocked", "Guarded", "Empowered", "Resentful", "Mad", "Offended"],
  },
  {
    name: "Fear",
    action: "Create safety",
    color: "#233E8C",
    emotions: ["Scared", "Anxious", "Terrified", "Worried", "Nervous", "Shy",
      "Jealous", "Timid", "Apprehensive", "Afraid", "Concerned", "Jittery"],
  },
  {
    name: "Content",
    action: "Relax - Rest - Heal",
    color: "#5E2A8A",
    emotions: ["Content", "Comfortable", "Safe", "Accepting", "Unashamed", "Peaceful",
      "Serene", "Composed", "Intimate", "Carefree", "Relieved", "Satisfied"],
  },
  {
    name: "Love",
    action: "Connect - Sacrifice",
    color: "#8A4C9E",
    emotions: ["Affection", "Lonely", "Vulnerable", "Nurtured", "Forgiving", "Compassion",
      "Kind", "Tender", "Abundant", "Grief", "Passion", "Embarrassed"],
  },
  {
    name: "Disgust",
    action: "Defend - Leave - Change perspective",
    color: "#C81E63",
    emotions: ["Blaming", "Disdain", "Hate", "Aversion", "Nauseous", "Humiliated",
      "Annoyed", "Irritable", "Guarded", "Tense", "Trapped", "Suspicious"],
  },
];

// Everyday words that aren't on the chart, mapped to their family.
const ALIASES: Record<string, string> = {
  happy: "Joy", joyful: "Joy", sad: "Sadness", upset: "Sadness", calm: "Content", relaxed: "Content",
  excited: "Excitement", loving: "Love", loved: "Love", angry: "Anger", cranky: "Anger", fearful: "Fear",
  disgusted: "Disgust", irritated: "Disgust", guilt: "Regret", regretful: "Regret",
};

export const familiesOf = (emotion: string): Family[] => {
  const q = emotion.toLowerCase();
  return CHART.filter(
    (f) => f.name.toLowerCase() === q || ALIASES[q] === f.name || f.emotions.some((e) => e.toLowerCase() === q),
  );
};
