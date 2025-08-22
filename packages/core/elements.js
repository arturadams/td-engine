import { ELEMENTS } from './content.js';

export const elements = Object.fromEntries(
  ELEMENTS.map(e => [e.key, { color: e.color, status: e.status }])
);
