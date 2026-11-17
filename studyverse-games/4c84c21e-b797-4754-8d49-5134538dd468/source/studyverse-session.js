// Only the learner-visible Multiple Choice Module contract belongs in this game.
// The private Studio sandbox supplies GameSDK.module; no answer key or score is read.
export const SAMPLE_ITEM = Object.freeze({
  id: 'synthetic-parking-demo',
  item_type: 'multiple_choice',
  content: {
    question: 'Which traffic signal means you must stop?',
    options: [{id:'a',text:'Green light'},{id:'b',text:'Red light'},{id:'c',text:'Flashing yellow light'}]
  }
});

export function normalizeMultipleChoice(raw) {
  if (!raw || raw.item_type !== 'multiple_choice') throw new Error('This parking game needs a Multiple Choice Study Item.');
  if (typeof raw.id !== 'string' || !raw.id.trim()) throw new Error('The Study Item has no valid ID.');
  const content = raw.content;
  if (!content || typeof content.question !== 'string' || !content.question.trim()) throw new Error('The Multiple Choice question is unavailable.');
  if (!Array.isArray(content.options) || content.options.length < 2) throw new Error('The question must offer at least two parking bays.');
  const seen = new Set();
  const options = content.options.map((option) => {
    if (!option || typeof option.id !== 'string' || !option.id.trim() || typeof option.text !== 'string' || !option.text.trim() || seen.has(option.id)) {
      throw new Error('The question contains invalid or duplicate answer options.');
    }
    seen.add(option.id);
    return {id:option.id,text:option.text};
  });
  // Never copy extra creator-only fields, explanations, answer keys or scores.
  return {id:raw.id, question:content.question, options};
}

export function createModuleSession(sdk) {
  if (!sdk || typeof sdk.getItem !== 'function' || typeof sdk.submitAnswer !== 'function') {
    throw new Error('StudyVerse Module SDK is unavailable. Use the private Game preview or try the sample.');
  }
  let submitted = false;
  return {
    kind:'module',
    async load() {
      const raw = await sdk.getItem();
      if (raw && raw.item_type !== 'multiple_choice') {
        if (typeof sdk.exitToStandard === 'function') await sdk.exitToStandard();
        throw new Error('This Game is fixed to Multiple Choice. Returning to Study Standard.');
      }
      return normalizeMultipleChoice(raw);
    },
    async submit(item, optionId) {
      if (submitted) throw new Error('This question was already submitted. Restart the private preview to retry.');
      if (!item.options.some((option) => option.id === optionId)) throw new Error('The selected bay is not an offered answer.');
      submitted = true; // Fail closed even if transport fails; never duplicate an uncertain submission.
      const result = await sdk.submitAnswer({item_id:item.id,response:{value:optionId}});
      if (result && result.ok === false) throw new Error('The SDK did not accept the parked answer.');
      return result;
    },
    async exit() {
      if (typeof sdk.exitToStandard === 'function') await sdk.exitToStandard();
    }
  };
}

export function createSampleSession() {
  return {
    kind:'sample',
    async load() { return normalizeMultipleChoice(SAMPLE_ITEM); },
    async submit(item, optionId) {
      if (!item.options.some((option) => option.id === optionId)) throw new Error('This parking bay is invalid.');
      // No SDK call, no correctness, no grade and no saved progress in the sample.
      return {status:'sample_only'};
    },
    async exit() {}
  };
}
