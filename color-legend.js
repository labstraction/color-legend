'use strict'

import { contrastingColor } from "@labstraction/color-utility";


/* The color-legend is a component that displays a color legend for map overlays */
export class ColorLegend extends HTMLElement {

  hostStyle = `
    :host {
      display: inline-block;
      font-family: sans-serif;
      font-size: ${this.fontSize}px;
      overflow: hidden;
    }
    .container {
      display: flex;
      flex-direction: ${this.isVertical ? 'column-reverse' : "row"};
      ${this.isVertical ? 'height: 100%;' : 'width: 100%;'}
    }
    .container > span {
      display: flex;
      flex-grow: 1;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      box-sizing: border-box;
      cursor: crosshair;
    }
  `
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }


  

  get min(){return parseFloat(this.getAttributeOrDefault('min-value', ''));}
  
  get max(){return parseFloat(this.getAttributeOrDefault('max-value'));}

  get isLog(){return this.getAttributeOrDefault('is-log', 'false') === 'true';}
  
  get unit(){return this.getAttributeOrDefault('unit-text', '');}
  
  get paletteName(){return this.getAttributeOrDefault('palette-name', 'x-rainbow');}

  get fontSize(){return parseInt(this.getAttributeOrDefault('font-size', '10'));}

  get isVertical(){return this.getAttributeOrDefault('is-vertical', 'true') === 'true';}

  get tooltiDirection(){return this.getAttributeOrDefault('tooltip-direction', 'left');}

  get colors(){return this.getAttributeOrDefault('color-set', '');}


  async connectedCallback() {
    this.shadowRoot.appendChild(this.createStyle(this.hostStyle));  
    this.shadowRoot.appendChild(await this.initComponent());
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue ) {
      this[name] = newValue
      this.initComponent()
    }
  } 

  static get observedAttributes() { return ['min-value', 'max-value', 'is-Log', 'palette-name', 'unit-text']; }

  createStyle(style){
    const styleTag = document.createElement('style');
    styleTag.textContent = style;
    return styleTag;
  }

  async initComponent() {

    const palette = this.paletteName ? await this.loadPalette(this.paletteName) :
                    this.colors ? this.color : undefined; 
   
    if (!palette) {return}               

    const container = this.createContainer();

    for (let i = 0; i < palette.length; i++) {

      container.appendChild(this.createColorSpan(i, this.min, this.max, palette, this.isLog, this.unit));

    }
    return container;
  }

  showTooltip(event, text, color, backgroundColor){
    if (document.getElementById('map-legend-tooltip')) {
      document.body.removeChild(document.getElementById('map-legend-tooltip'));
    }
    const tooltip = document.createElement('div');
    tooltip.appendChild(document.createTextNode(text));
    
    tooltip.style.position = 'absolute';
    tooltip.style.color = color;
    tooltip.style.backgroundColor = backgroundColor;
    tooltip.style.padding = "4px";
    tooltip.style.borderRadius = "8px";
    tooltip.style.zIndex = 1000000;
    tooltip.style.cursor = 'crosshair';
    console.log(event);
    tooltip.id = 'map-legend-tooltip'
    const tooltipHeight = this.measure(tooltip, (el) => el.offsetHeight);
    const tooltipWidth = this.measure(tooltip, (el) => el.offsetWidth);

    tooltip.style.left = this.tooltiDirection === 'left' ? (event.clientX - tooltipWidth - 8) + 'px':
                         this.tooltiDirection === 'right' ? (event.clientX + 8) + 'px': (event.clientX - tooltipWidth/2) + 'px';

    tooltip.style.top = this.tooltiDirection === 'down' ? (event.clientY + 8) + 'px':
                        this.tooltiDirection === 'up' ? (event.clientY - tooltipHeight - 8) + 'px': (event.clientY - tooltipHeight/2) + 'px';
    
    document.body.appendChild(tooltip);

    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      if (document.getElementById('map-legend-tooltip')) {
        document.body.removeChild(document.getElementById('map-legend-tooltip'));
      }
    }, 1000);

  }

  createContainer(){
    const container = document.createElement('div');
    container.classList.add('container');
    return container;
  }

  createColorSpan(index, min, max, palette, isLog, unit){
    const span = document.createElement('span');
    span.style.backgroundColor = palette[index];
    span.style.color = contrastingColor(palette[index]);

    let text = '';
    if (this.min !== undefined && this.max !== undefined) {
      text = this.roundTo(this.getStep(this.min, this.max, palette.length, this.isLog, index), 1) + (this.unit || '');
      span.addEventListener('mouseover', (e) => this.showTooltip(e, text, span.style.color, span.style.backgroundColor));
    }

    if (index === 0 || index === palette.length - 1) {
      span.appendChild(document.createTextNode(text));
      span.style.padding = "2px";
    }
    return span;
  }

   measure(el, fn) {
    var pV = el.style.visibility, 
        pP = el.style.position;
        
    el.style.visibility = 'hidden';
    el.style.position = 'absolute';
    
    document.body.appendChild(el);
    var result = fn(el);
    el.parentNode.removeChild(el);

    el.style.visibility = pV;
    el.style.position = pP;
    return result;
}


  async loadPalette(name){
    const palettes =  await fetch("./assets/palette.json").then(resp => resp.json()).catch(e => console.log(e));
    return palettes[name]
  }

  getStep(min, max, stepNumber, isLog, index) {
    if (isLog) {
      const minLog = Math.log(min);
      const maxLog = Math.log(max);
      const step = (maxLog - minLog) / (stepNumber - 1);
      return Math.exp(minLog + step * index);
    } else {
      return ((max - min) / (stepNumber - 1)) * index;
    }
  }


  roundTo(n, digits = 0) {
    var multiplicator = Math.pow(10, digits);
    n = n * multiplicator;
    return Math.round(n) / multiplicator;
  }

  getAttributeOrDefault(attribute, defaultValue) {
    if (this.hasAttribute(attribute)) {
      return this.getAttribute(attribute);
    } else if (defaultValue) {
      this.setAttribute(attribute, defaultValue);
      return defaultValue;
    }
  }

  setNewAttribute(attribute, newValue) {
    if(newValue !== this.getAttribute(attribute)){
      this.setAttribute(attribute, newValue);
    }
  }

}

customElements.define('color-legend', ColorLegend);