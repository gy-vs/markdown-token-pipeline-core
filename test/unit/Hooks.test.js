import { Marked } from '../../lib/marked.esm.js';
import { timeout } from './utils.js';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

describe('Hooks', () => {
  let marked;
  beforeEach(() => {
    marked = new Marked();
  });

  it('should preprocess markdown', () => {
    marked.use({
      hooks: {
        preprocess(markdown) {
          return `# preprocess\n\n${markdown}`;
        }
      }
    });
    const html = marked.parse('*text*');
    assert.strictEqual(html.trim(), '<h1>preprocess</h1>\n<p><em>text</em></p>');
  });

  it('should preprocess async', async() => {
    marked.use({
      async: true,
      hooks: {
        async preprocess(markdown) {
          await timeout();
          return `# preprocess async\n\n${markdown}`;
        }
      }
    });
    const promise = marked.parse('*text*');
    assert.ok(promise instanceof Promise);
    const html = await promise;
    assert.strictEqual(html.trim(), '<h1>preprocess async</h1>\n<p><em>text</em></p>');
  });

  it('should preprocess options', () => {
    marked.use({
      hooks: {
        preprocess(markdown) {
          this.options.breaks = true;
          return markdown;
        }
      }
    });
    const html = marked.parse('line1\nline2');
    assert.strictEqual(html.trim(), '<p>line1<br>line2</p>');
  });

  it('should preprocess options async', async() => {
    marked.use({
      async: true,
      hooks: {
        async preprocess(markdown) {
          await timeout();
          this.options.breaks = true;
          return markdown;
        }
      }
    });
    const html = await marked.parse('line1\nline2');
    assert.strictEqual(html.trim(), '<p>line1<br>line2</p>');
  });

  it('should postprocess html', () => {
    marked.use({
      hooks: {
        postprocess(html) {
          return html + '<h1>postprocess</h1>';
        }
      }
    });
    const html = marked.parse('*text*');
    assert.strictEqual(html.trim(), '<p><em>text</em></p>\n<h1>postprocess</h1>');
  });

  it('should postprocess async', async() => {
    marked.use({
      async: true,
      hooks: {
        async postprocess(html) {
          await timeout();
          return html + '<h1>postprocess async</h1>\n';
        }
      }
    });
    const promise = marked.parse('*text*');
    assert.ok(promise instanceof Promise);
    const html = await promise;
    assert.strictEqual(html.trim(), '<p><em>text</em></p>\n<h1>postprocess async</h1>');
  });

  it('should process all hooks in reverse', async() => {
    marked.use({
      hooks: {
        preprocess(markdown) {
          return `# preprocess1\n\n${markdown}`;
        },
        postprocess(html) {
          return html + '<h1>postprocess1</h1>\n';
        }
      }
    });
    marked.use({
      async: true,
      hooks: {
        preprocess(markdown) {
          return `# preprocess2\n\n${markdown}`;
        },
        async postprocess(html) {
          await timeout();
          return html + '<h1>postprocess2 async</h1>\n';
        }
      }
    });
    const promise = marked.parse('*text*');
    assert.ok(promise instanceof Promise);
    const html = await promise;
    assert.strictEqual(html.trim(), '<h1>preprocess1</h1>\n<h1>preprocess2</h1>\n<p><em>text</em></p>\n<h1>postprocess2 async</h1>\n<h1>postprocess1</h1>');
  });

  it('should processAllTokens', () => {
    marked.use({
      hooks: {
        processAllTokens(tokens) {
          assert.ok(Array.isArray(tokens));
          // remove the paragraph token, leaving only the space token
          return tokens.filter(token => token.type !== 'paragraph');
        }
      }
    });
    const html = marked.parse('text');
    assert.strictEqual(html.trim(), '');
  });

  it('should processAllTokens async', async() => {
    marked.use({
      async: true,
      hooks: {
        async processAllTokens(tokens) {
          await timeout();
          assert.ok(Array.isArray(tokens));
          // remove the paragraph token
          return tokens.filter(token => token.type !== 'paragraph');
        }
      }
    });
    const promise = marked.parse('text');
    assert.ok(promise instanceof Promise);
    const html = await promise;
    assert.strictEqual(html.trim(), '');
  });

  it('should be able to add a top level token in processAllTokens', () => {
    marked.use({
      hooks: {
        processAllTokens(tokens) {
          tokens.unshift({
            type: 'heading',
            raw: '# added\n',
            depth: 1,
            text: 'added',
            tokens: [
              { type: 'text', raw: 'added', text: 'added' }
            ]
          });
          return tokens;
        }
      }
    });
    const html = marked.parse('text');
    assert.strictEqual(html.trim(), '<h1>added</h1>\n<p>text</p>');
  });

  it('should be able to replace a top level token in processAllTokens', () => {
    marked.use({
      hooks: {
        processAllTokens(tokens) {
          return tokens.map(token => {
            if (token.type === 'heading') {
              return {
                type: 'heading',
                raw: '# replaced',
                depth: token.depth,
                text: 'replaced',
                tokens: [
                  { type: 'text', raw: 'replaced', text: 'replaced' }
                ]
              };
            }
            return token;
          });
        }
      }
    });
    const html = marked.parse('# original');
    assert.strictEqual(html.trim(), '<h1>replaced</h1>');
  });

  it('should be able to modify nested tokens in processAllTokens', () => {
    marked.use({
      hooks: {
        processAllTokens(tokens) {
          const blockquote = tokens.find(token => token.type === 'blockquote');
          blockquote.tokens = [
            {
              type: 'paragraph',
              raw: 'replaced',
              text: 'replaced',
              tokens: [
                { type: 'text', raw: 'replaced', text: 'replaced' }
              ]
            }
          ];
          return tokens;
        }
      }
    });
    const html = marked.parse('> original');
    assert.strictEqual(html.trim(), '<blockquote>\n<p>replaced</p>\n</blockquote>');
  });

  it('should walk tokens returned by processAllTokens', () => {
    const walkedTokens = [];
    marked.use({
      hooks: {
        processAllTokens(tokens) {
          // replace the paragraph with a heading; the heading token should be walked
          return [
            {
              type: 'heading',
              raw: '# replaced',
              depth: 1,
              text: 'replaced',
              tokens: [
                { type: 'text', raw: 'replaced', text: 'replaced' }
              ]
            }
          ];
        }
      },
      walkTokens(token) {
        walkedTokens.push(token.type);
      }
    });
    const html = marked.parse('original');
    assert.strictEqual(html.trim(), '<h1>replaced</h1>');
    assert.deepStrictEqual(walkedTokens, ['heading', 'text']);
  });

  it('should walk added nested tokens returned by processAllTokens async', async() => {
    const walkedTokens = [];
    marked.use({
      async: true,
      hooks: {
        async processAllTokens(tokens) {
          await timeout();
          tokens.unshift({
            type: 'blockquote',
            raw: '> added',
            text: 'added',
            tokens: [
              {
                type: 'paragraph',
                raw: 'added',
                text: 'added',
                tokens: [
                  { type: 'text', raw: 'added', text: 'added' }
                ]
              }
            ]
          });
          return tokens;
        }
      },
      walkTokens(token) {
        walkedTokens.push(token.type);
      }
    });
    const html = await marked.parse('original');
    assert.strictEqual(html.trim(), '<blockquote>\n<p>added</p>\n</blockquote>\n<p>original</p>');
    assert.ok(walkedTokens.includes('blockquote'));
    assert.deepStrictEqual(walkedTokens.slice(0, 3), ['blockquote', 'paragraph', 'text']);
  });

  it('should chain multiple processAllTokens hooks with the output of one feeding the next', () => {
    marked.use({
      hooks: {
        processAllTokens(tokens) {
          // assigned first: runs last, receives output of the second hook
          return tokens.filter(token => token.type !== 'space');
        }
      }
    });
    marked.use({
      hooks: {
        processAllTokens(tokens) {
          // assigned last: runs first, removes paragraph tokens
          return tokens.filter(token => token.type !== 'paragraph');
        }
      }
    });
    const html = marked.parse('text');
    assert.strictEqual(html.trim(), '');
  });

  it('should run processAllTokens after preprocess and lexer and before walkTokens and the parser', () => {
    const order = [];
    marked.use({
      hooks: {
        preprocess(markdown) {
          order.push('preprocess');
          return markdown;
        },
        processAllTokens(tokens) {
          order.push('processAllTokens');
          return tokens;
        },
        postprocess(html) {
          order.push('postprocess');
          return html;
        }
      },
      walkTokens() {
        order.push('walkTokens');
      }
    });
    marked.parse('text');
    assert.deepStrictEqual(order, ['preprocess', 'processAllTokens', 'walkTokens', 'walkTokens', 'postprocess']);
  });

  it('should throw a clear error when processAllTokens does not return an array', () => {
    marked.use({
      hooks: {
        processAllTokens() {
          return 'not an array';
        }
      }
    });
    assert.throws(() => marked.parse('text'), /processAllTokens hooks must return an array of tokens/);
  });

  it('should throw a clear error when processAllTokens returns undefined', () => {
    marked.use({
      hooks: {
        processAllTokens() {}
      }
    });
    assert.throws(() => marked.parse('text'), /processAllTokens hooks must return an array of tokens/);
  });

  it('should reject when processAllTokens returns a non array async', async() => {
    marked.use({
      async: true,
      hooks: {
        async processAllTokens() {
          await timeout();
          return 'not an array';
        }
      }
    });
    await assert.rejects(
      () => marked.parse('text'),
      /processAllTokens hooks must return an array of tokens/
    );
  });

  it('should reject when processAllTokens rejects async', async() => {
    marked.use({
      async: true,
      hooks: {
        async processAllTokens() {
          await timeout();
          throw new Error('processAllTokens failed');
        }
      }
    });
    await assert.rejects(
      () => marked.parse('text'),
      /processAllTokens failed/
    );
  });

  it('should processAllTokens in parseInline', () => {
    marked.use({
      hooks: {
        processAllTokens(tokens) {
          // remove the emphasis token so only the text remains
          return tokens.filter(token => token.type !== 'em');
        }
      }
    });
    const html = marked.parseInline('a *b* c');
    assert.strictEqual(html, 'a  c');
  });

  it('should processAllTokens in parseInline async', async() => {
    marked.use({
      async: true,
      hooks: {
        async processAllTokens(tokens) {
          await timeout();
          return tokens.filter(token => token.type !== 'em');
        }
      }
    });
    const html = await marked.parseInline('a *b* c');
    assert.strictEqual(html, 'a  c');
  });

  it('should isolate processAllTokens hooks between separate Marked instances', () => {
    const markedWithHook = new Marked({
      hooks: {
        processAllTokens(tokens) {
          return tokens.filter(token => token.type !== 'paragraph');
        }
      }
    });
    const markedWithoutHook = new Marked();

    assert.strictEqual(markedWithHook.parse('text').trim(), '');
    assert.strictEqual(markedWithoutHook.parse('text').trim(), '<p>text</p>');
  });
});
