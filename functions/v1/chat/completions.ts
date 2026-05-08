// /v1/chat/completions — OpenAI-compatible alias for /api/chat. Delegates to
// the same implementation so quota + logging behave identically.
export { onRequestPost, onRequestOptions } from '../../api/chat';
