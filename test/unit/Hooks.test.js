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
          // remove all space tokens
          return tokens.filter(token => token.type !== 'space');
        }
      }
    });
    const html = marked.parse('# heading\n\n*text*');
    assert.strictEqual(html.trim(), '<h1>heading</h1>\n<p><em>text</em></p>');
  });

  it('should processAllTokens async', async() => {
    marked.use({
      async: true,
      hooks: {
        async processAllTokens(tokens) {
          await timeout();
          // remove all space tokens
          return tokens.filter(token => token.type !== 'space');
        }
      }
    });
    const promise = marked.parse('# heading\n\n*text*');
    assert.ok(promise instanceof Promise);
    const html = await promise;
    assert.strictEqual(html.trim(), '<h1>heading</h1>\n<p><em>text</em></p>');
  });

  it('should add a top level token with processAllTokens', () => {
    marked.use({
      hooks: {
        processAllTokens(tokens) {
          // add an hr token between every top level token
          const hrToken = { type: 'hr', raw: '\n---\n' };
          return tokens.flatMap(token => token.type === 'space' ? [token] : [token, hrToken]);
        }
      }
    });
    const html = marked.parse('# heading\n\nparagraph');
    assert.strictEqual(html.trim(), '<h1>heading</h1>\n<hr>\n<p>paragraph</p>\n<hr>');
  });

  it('should replace a top level token with processAllTokens', () => {
    marked.use({
      hooks: {
        processAllTokens(tokens) {
          return tokens.map((token) => {
            if (token.type === 'heading') {
              return {
                type: 'paragraph',
                raw: token.raw,
                text: token.text,
                tokens: token.tokens
              };
            }

            return token;
          });
        }
      }
    });
    const html = marked.parse('# heading\n\nparagraph');
    assert.strictEqual(html.trim(), '<p>heading</p>\n<p>paragraph</p>');
  });

  it('should delete a top level token with processAllTokens', () => {
    marked.use({
      hooks: {
        processAllTokens(tokens) {
          return tokens.filter(token => token.type !== 'heading');
        }
      }
    });
    const html = marked.parse('# heading\n\nparagraph');
    assert.strictEqual(html.trim(), '<p>paragraph</p>');
  });

  it('should pass tokens added by processAllTokens to walkTokens', () => {
    const walkedTokens = [];
    marked.use({
      walkTokens(token) {
        walkedTokens.push(token);
      },
      hooks: {
        processAllTokens(tokens) {
          // insert a heading at the start
          return [
            {
              type: 'heading',
              raw: '# inserted\n',
              depth: 1,
              text: 'inserted',
              tokens: [{ type: 'text', raw: 'inserted', text: 'inserted' }]
            },
            ...tokens
          ];
        }
      }
    });
    const html = marked.parse('paragraph');
    assert.strictEqual(html.trim(), '<h1>inserted</h1>\n<p>paragraph</p>');
    assert.ok(walkedTokens.some(token => token.type === 'heading' && token.text === 'inserted'));
    assert.ok(walkedTokens.some(token => token.type === 'text' && token.text === 'inserted'));
  });

  it('should pass nested tokens modified by processAllTokens to walkTokens', () => {
    const walkedTokenTexts = [];
    marked.use({
      walkTokens(token) {
        if (token.type === 'text') {
          walkedTokenTexts.push(token.text);
        }
      },
      hooks: {
        processAllTokens(tokens) {
          // modify the nested tokens of the heading
          for (const token of tokens) {
            if (token.type === 'heading') {
              token.tokens = [{ type: 'text', raw: 'replaced', text: 'replaced' }];
            }
          }
          return tokens;
        }
      }
    });
    const html = marked.parse('# heading');
    assert.strictEqual(html.trim(), '<h1>replaced</h1>');
    assert.deepStrictEqual(walkedTokenTexts, ['replaced']);
  });

  it('should call multiple processAllTokens hooks in order with the return value', () => {
    const calls = [];
    marked.use({
      hooks: {
        processAllTokens(tokens) {
          calls.push('first input: ' + tokens.length);
          return tokens;
        }
      }
    });
    marked.use({
      hooks: {
        processAllTokens(tokens) {
          calls.push('second input: ' + tokens.length);
          // return value becomes the input of the first-registered hook
          return tokens.filter(token => token.type !== 'paragraph');
        }
      }
    });
    const html = marked.parse('# heading\n\nparagraph');
    // hooks are called starting with the function assigned last, each receiving the previous return value
    assert.deepStrictEqual(calls, ['second input: 2', 'first input: 1']);
    assert.strictEqual(html.trim(), '<h1>heading</h1>');
  });

  it('should call multiple processAllTokens hooks async', async() => {
    marked.use({
      hooks: {
        async processAllTokens(tokens) {
          await timeout();
          return tokens.filter(token => token.type !== 'space');
        }
      }
    });
    marked.use({
      async: true,
      hooks: {
        async processAllTokens(tokens) {
          await timeout();
          // remove the heading
          return tokens.filter(token => token.type !== 'heading');
        }
      }
    });
    const html = await marked.parse('# heading\n\nparagraph');
    assert.strictEqual(html.trim(), '<p>paragraph</p>');
  });

  it('should throw when processAllTokens does not return an array', () => {
    marked.use({
      hooks: {
        processAllTokens() {
          return null;
        }
      }
    });
    assert.throws(() => marked.parse('# heading'), /hooks\.processAllTokens did not return an array of tokens/);
  });

  it('should reject when processAllTokens does not return an array async', async() => {
    marked.use({
      async: true,
      hooks: {
        async processAllTokens() {
          return undefined;
        }
      }
    });
    await assert.rejects(marked.parse('# heading'), /hooks\.processAllTokens did not return an array of tokens/);
  });

  it('should reject when a processAllTokens hook rejects async', async() => {
    marked.use({
      async: true,
      hooks: {
        async processAllTokens() {
          await timeout();
          throw new Error('processAllTokens failed');
        }
      }
    });
    await assert.rejects(marked.parse('# heading'), /processAllTokens failed/);
  });

  it('should run preprocess, processAllTokens, walkTokens, parser, and postprocess in order', () => {
    const calls = [];
    marked.use({
      walkTokens(token) {
        calls.push('walkTokens: ' + token.type);
      },
      hooks: {
        preprocess(markdown) {
          calls.push('preprocess');
          return markdown;
        },
        processAllTokens(tokens) {
          calls.push('processAllTokens: ' + tokens.length);
          return tokens;
        },
        postprocess(html) {
          calls.push('postprocess');
          return html;
        }
      }
    });
    marked.parse('# heading\n\nparagraph');
    assert.strictEqual(calls[0], 'preprocess');
    assert.strictEqual(calls[1], 'processAllTokens: 2');
    assert.ok(calls.slice(2, -1).every(call => call.startsWith('walkTokens:')));
    assert.strictEqual(calls[calls.length - 1], 'postprocess');
  });

  it('should run processAllTokens with parseInline', () => {
    marked.use({
      hooks: {
        processAllTokens(tokens) {
          // remove strong tokens
          return tokens.filter(token => token.type !== 'strong');
        }
      }
    });
    const html = marked.parseInline('*em* and **strong**');
    assert.strictEqual(html, '<em>em</em> and ');
  });

  it('should run processAllTokens with parseInline async', async() => {
    marked.use({
      async: true,
      hooks: {
        async processAllTokens(tokens) {
          await timeout();
          // remove em tokens
          return tokens.filter(token => token.type !== 'em');
        }
      }
    });
    const html = await marked.parseInline('*em* and **strong**');
    assert.strictEqual(html, ' and <strong>strong</strong>');
  });

  it('should keep processAllTokens hooks isolated on separate Marked instances', () => {
    const marked1 = new Marked({
      hooks: {
        processAllTokens(tokens) {
          return tokens.filter(token => token.type !== 'heading');
        }
      }
    });
    const marked2 = new Marked({
      hooks: {
        processAllTokens(tokens) {
          return tokens;
        }
      }
    });
    assert.strictEqual(marked1.parse('# heading\n\nparagraph').trim(), '<p>paragraph</p>');
    assert.strictEqual(marked2.parse('# heading\n\nparagraph').trim(), '<h1>heading</h1>\n<p>paragraph</p>');
  });
});
