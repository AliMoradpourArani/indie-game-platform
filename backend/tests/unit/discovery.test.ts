import { describe, expect, it } from 'vitest';
import { browseQuerySchema } from '../../src/modules/games/discovery.js';

describe('browse query', () => {
  it('applies defaults and clamps page size', () => {
    const q = browseQuerySchema.parse({});
    expect(q).toMatchObject({ sort: 'newest', page: 1, pageSize: 20 });
    expect(() => browseQuerySchema.parse({ pageSize: 500 })).toThrow();
    expect(browseQuerySchema.parse({ search: 'lantern', genre: 'Adventure', sort: 'title', page: 2 }).page).toBe(2);
  });
});
