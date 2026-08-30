import { delay } from '../utils/animation-utils.js';

export function renderMLDetectionPanel(): string {
  return `
    <div class="ml-panel-container anim-fade-in">
      <div class="ml-header">
        <div class="card-title">SENTINEL-1 SAR</div>
        <div class="card-subtitle">OIL SPILL DETECTION</div>
        <div class="badge badge-warning" style="margin-top:8px;">DEMO ML INFERENCE</div>
      </div>
      
      <div style="margin-top: 16px; margin-bottom: 8px; font-size: 13px; color: var(--text-secondary);">Select Input Image:</div>
      <div class="sar-selection" style="display:flex; gap:16px; margin-bottom: 24px;">
        <div class="sar-option selected" id="sar-option-1" style="flex:1; cursor:pointer; border:2px solid var(--primary-main); background:var(--bg-surface); padding:8px; border-radius:8px; text-align:center; transition:all 0.3s;">
          <img src="/assets/sar-placeholder.png" alt="SAR 1" style="width:100%; height:80px; object-fit:cover; border-radius:4px; margin-bottom:8px;" />
          <div style="font-size:12px; font-weight:var(--fw-medium); color:var(--text-primary);">Image A</div>
          <div style="font-size:11px; color:var(--text-secondary);">Arabian Sea</div>
        </div>
        <div class="sar-option" id="sar-option-2" style="flex:1; cursor:pointer; border:2px solid transparent; background:var(--bg-surface); padding:8px; border-radius:8px; text-align:center; opacity:0.6; transition:all 0.3s;">
          <img src="/assets/sar-placeholder.png" alt="SAR 2" style="width:100%; height:80px; object-fit:cover; border-radius:4px; margin-bottom:8px; filter: hue-rotate(45deg) contrast(1.2);" />
          <div style="font-size:12px; font-weight:var(--fw-medium); color:var(--text-primary);">Image B</div>
          <div style="font-size:11px; color:var(--text-secondary);">Coastal Region</div>
        </div>
      </div>

      <div class="ml-visualization">
        <div class="ml-image-box">
          <div class="ml-image-title">RAW SAR IMAGE</div>
          <div class="ml-img-wrapper">
            <img src="/assets/sar-placeholder.png" alt="Raw SAR" class="ml-img" id="ml-raw-img" />
          </div>
        </div>
        
        <div class="ml-process-arrow">
          <div id="ml-spinner" style="display:none;" class="ml-spinner"></div>
          <div id="ml-process-status" style="display:none;">Waiting</div>
        </div>

        <div class="ml-image-box">
          <div class="ml-image-title">ML SEGMENTATION</div>
          <div class="ml-img-wrapper">
             <img src="/assets/sar-placeholder.png" alt="Segmented SAR" class="ml-img" id="ml-img-result" style="filter: brightness(0.4); opacity: 0;"/>
             <div class="ml-overlay-polygon" id="ml-overlay-polygon" style="opacity: 0;"></div>
          </div>
        </div>
      </div>

      <div class="ml-results anim-fade-in" id="ml-results" style="display: none;">
        <div class="stat-row">
          <span class="stat-label">Output</span>
          <span class="stat-value" id="ml-res-output" style="color:#ff6e40; font-weight:var(--fw-bold);">Oil Spill Detected</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Confidence</span>
          <span class="stat-value" id="ml-res-conf">94.2%</span>
        </div>
        <div class="stat-row" id="ml-res-area-row">
          <span class="stat-label">Estimated Area</span>
          <span class="stat-value">14.8 km²</span>
        </div>
      </div>

      <button class="btn btn-primary btn-block" id="btn-run-ml" style="margin-top:var(--space-2);">RUN ML DETECTION</button>
    </div>
  `;
}

export function runMLSequence(container: HTMLElement): Promise<{ spillDetected: boolean; confidence: number; areaKm2: number }> {
  return new Promise((resolve) => {
    const btn = container.querySelector('#btn-run-ml') as HTMLButtonElement;
    const status = container.querySelector('#ml-process-status') as HTMLElement;
    const spinner = container.querySelector('#ml-spinner') as HTMLElement;
    const imgResult = container.querySelector('#ml-img-result') as HTMLImageElement;
    const rawImg = container.querySelector('#ml-raw-img') as HTMLImageElement;
    const polygon = container.querySelector('#ml-overlay-polygon') as HTMLElement;
    const results = container.querySelector('#ml-results') as HTMLElement;
    const resOutput = container.querySelector('#ml-res-output') as HTMLElement;
    const resConf = container.querySelector('#ml-res-conf') as HTMLElement;
    const areaRow = container.querySelector('#ml-res-area-row') as HTMLElement;
    
    const opt1 = container.querySelector('#sar-option-1') as HTMLElement;
    const opt2 = container.querySelector('#sar-option-2') as HTMLElement;

    let selectedOption = 1;

    opt1.addEventListener('click', () => {
      if (btn.disabled) return;
      selectedOption = 1;
      opt1.style.border = '2px solid var(--primary-main)';
      opt1.style.opacity = '1';
      opt2.style.border = '2px solid transparent';
      opt2.style.opacity = '0.6';
      rawImg.style.filter = 'none';
      imgResult.style.filter = 'brightness(0.4)';
    });

    opt2.addEventListener('click', () => {
      if (btn.disabled) return;
      selectedOption = 2;
      opt2.style.border = '2px solid var(--primary-main)';
      opt2.style.opacity = '1';
      opt1.style.border = '2px solid transparent';
      opt1.style.opacity = '0.6';
      rawImg.style.filter = 'hue-rotate(45deg) contrast(1.2)';
      imgResult.style.filter = 'hue-rotate(45deg) contrast(1.2) brightness(0.4)';
    });

    if (!btn || !status || !spinner || !imgResult || !polygon || !results) {
      console.error('ML panel DOM elements missing');
      return resolve({ spillDetected: false, confidence: 0, areaKm2: 0 });
    }

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'PROCESSING...';
      spinner.style.display = 'block';
      status.style.display = 'block';
      
      const steps = [
        'Loading SAR image...',
        'Preprocessing...',
        'ML segmentation...',
        'Analyzing pixels...',
        selectedOption === 1 ? 'Spill detected!' : 'Low confidence...'
      ];

      for (let i = 0; i < steps.length; i++) {
        status.textContent = steps[i];
        
        // Trigger realistic zoom on globe exactly when "Spill detected!" appears
        if (i === steps.length - 1 && selectedOption === 1) {
          const globe = document.getElementById('globe-viz');
          if (globe && (window as any).myGlobeInstance) {
            (window as any).myGlobeInstance.pointOfView({ lat: 19.34, lng: 71.25, altitude: 0.08 }, 2000);
            setTimeout(() => {
              globe.style.opacity = '0';
              setTimeout(() => { if (globe.style.opacity === '0') globe.style.display = 'none'; }, 1500);
            }, 1200); // fade out during zoom
          }
        }
        
        await delay(600);
      }

      spinner.style.display = 'none';
      btn.style.display = 'none';

      // Reveal segmentation overlay
      imgResult.style.opacity = '1';
      
      if (selectedOption === 1) {
        polygon.style.opacity = '1';
        resOutput.textContent = 'Oil Spill Detected';
        resOutput.style.color = '#ff6e40';
        resConf.textContent = '94.2%';
        areaRow.style.display = 'flex';
      } else {
        polygon.style.display = 'none'; // No polygon for negative case
        resOutput.textContent = 'Look-alike (Not a spill)';
        resOutput.style.color = 'var(--text-secondary)';
        resConf.textContent = '28.4%';
        areaRow.style.display = 'none';
      }

      // Reveal numerical results
      results.style.display = 'block';

      await delay(1500);

      if (selectedOption === 1) {
        resolve({
          spillDetected: true,
          confidence: 0.942,
          areaKm2: 14.8
        });
      } else {
        resolve({
          spillDetected: false,
          confidence: 0.284,
          areaKm2: 0
        });
      }
    }, { once: true });
  });
}

