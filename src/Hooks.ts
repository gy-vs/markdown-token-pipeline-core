import { _defaults } from './defaults.ts';
import type { MarkedOptions } from './MarkedOptions.ts';
import type { Token } from './Tokens.ts';

export class _Hooks {
  options: MarkedOptions;

  constructor(options?: MarkedOptions) {
    this.options = options || _defaults;
  }

  static passThroughHooks = new Set([
    'preprocess',
    'postprocess',
    'processAllTokens'
  ]);

  /**
   * Process markdown before marked
   */
  preprocess(markdown: string) {
    return markdown;
  }

  /**
   * Process all tokens after the lexer and before walkTokens
   */
  processAllTokens(tokens: Token[]) {
    return tokens;
  }

  /**
   * Process HTML after marked is finished
   */
  postprocess(html: string) {
    return html;
  }
}

export interface MarkedHooks {
  preprocess: (markdown: string) => string | Promise<string>;
  processAllTokens: (tokens: Token[]) => Token[] | Promise<Token[]>;
  postprocess: (html: string) => string | Promise<string>;
}
