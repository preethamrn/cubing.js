import {
  HTMLElementShim,
  customElementsShim,
} from "./node-custom-element-shims";

export class CSSSource {
  constructor(private sourceText: string) {
    // TODO: Replace with adopted style sheets some day if we can.
    // const blob = new Blob([sourceText], {
    //   type: "text/utf8",
    // });
    // this.url = URL.createObjectURL(blob);
  }

  getAsString(): string {
    return this.sourceText;
  }
}

// - Wrapped element
//   - Shadow root
//     - Content wrapper
export class ManagedCustomElement extends HTMLElementShim {
  public shadow: ShadowRoot;
  public contentWrapper: HTMLDivElement; // TODO: can we get rid of this wrapper?

  private cssSourceMap: Map<CSSSource, HTMLStyleElement> = new Map();
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "closed" });

    this.contentWrapper = document.createElement("div");
    this.contentWrapper.classList.add("wrapper");
    this.shadow.appendChild(this.contentWrapper);
  }

  // Add the source, if not already added.
  public addCSS(cssSource: CSSSource): void {
    if (this.cssSourceMap.get(cssSource)) {
      return;
    }

    const cssElem: HTMLStyleElement = document.createElement("style");
    cssElem.textContent = cssSource.getAsString();

    this.cssSourceMap.set(cssSource, cssElem);
    this.shadow.appendChild(cssElem);
  }

  // Remove the source, if it's currently added.
  public removeCSS(cssSource: CSSSource): void {
    const cssElem = this.cssSourceMap.get(cssSource);
    if (!cssElem) {
      return;
    }
    this.shadow.removeChild(cssElem);
    this.cssSourceMap.delete(cssSource);
  }

  public addElement<T extends Node>(element: T): T {
    return this.contentWrapper.appendChild(element);
  }

  public prependElement<T extends Node>(element: T): void {
    this.contentWrapper.prepend(element);
  }

  public removeElement<T extends Node>(element: T): T {
    return this.contentWrapper.removeChild(element);
  }
}

customElementsShim.define(
  "twisty-managed-custom-element",
  ManagedCustomElement,
);
