declare module 'ts-buildkit' {
  export interface BuildConfig {
    entry?: string;
    output?: string;
    format?: 'cjs' | 'esm' | 'umd';
  }

  export class Builder {
    constructor(config?: BuildConfig);
    build(): Promise<void>;
  }

  export const animations: {
    fadeIn: any;
    slideIn: any;
    scaleIn: any;
    bounce: any;
    shake: any;
  };

  export default Builder;
}