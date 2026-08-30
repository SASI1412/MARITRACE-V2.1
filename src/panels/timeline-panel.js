/**
 * Investigation timeline panel — visually connected vertical timeline
 */

export const timelineSteps = [
  { id: 'step-1', title: 'DETECTION', time: '06:30 UTC' },
  { id: 'step-2', title: 'SPILL ESTIMATION', time: '06:32 UTC' },
  { id: 'step-3', title: 'BACKWARD DRIFT', time: '07:15 UTC' },
  { id: 'step-4', title: 'ORIGIN ZONE', time: '07:18 UTC' },
  { id: 'step-5', title: 'AIS CORRELATION', time: '07:20 UTC' },
  { id: 'step-6', title: 'CANDIDATE RANKING', time: '07:22 UTC' },
  { id: 'step-7', title: 'FORWARD DRIFT', time: '07:26 UTC' },
  { id: 'step-8', title: 'FINAL EVIDENCE', time: '07:28 UTC' },
];

export function renderTimelinePanel(activeStepIndex = -1) {
  let html = '<div class="professional-pipeline" style="display:flex; flex-direction:column; padding-left: 24px; position:relative; margin-bottom: 24px;">';
  
  // Vertical connected line background
  html += '<div style="position:absolute; left:28px; top:12px; bottom:12px; width:2px; background:rgba(255,255,255,0.1); z-index:0;"></div>';

  timelineSteps.forEach((step, idx) => {
    // Map the 8 timeline steps to the workflow steps
    // Workflow step 0 is ML panel, step 1 is the first timeline step, etc.
    const logicalIdx = idx + 1;
    
    const isComplete = logicalIdx < activeStepIndex;
    const isActive = logicalIdx === activeStepIndex;
    
    let dotColor = 'rgba(255,255,255,0.2)';
    let titleColor = 'var(--text-muted)';
    let dotScale = 'scale(1)';
    let animClass = '';
    
    if (isComplete) {
      dotColor = 'var(--color-success)';
      titleColor = 'var(--color-success)';
    } else if (isActive) {
      dotColor = 'var(--color-primary)';
      titleColor = '#ffffff';
      dotScale = 'scale(1.5)';
      animClass = 'anim-pulse';
    }

    html += `
      <div class="timeline-card" style="display:flex; align-items:center; position:relative; margin-bottom:16px; z-index:1;">
        <!-- Timeline Dot -->
        <div class="${animClass}" style="width:10px; height:10px; border-radius:50%; background:${dotColor}; transform:${dotScale}; transition:all 0.3s ease; box-shadow:0 0 10px ${dotColor};"></div>
        
        <div style="display:flex; flex-direction:column; margin-left:24px; flex:1; transition:all 0.3s ease;">
          <div style="font-size:12px; font-weight:800; letter-spacing:0.1em; color:${titleColor};">${step.title}</div>
        </div>
        <div style="font-size:11px; font-weight:600; font-family:var(--font-mono); color:var(--text-muted);">${step.time}</div>
      </div>
    `;
  });

  html += '</div>';
  return html;
}

export function updateTimelineStep(container, stepIndex) {
  if (!container) return;
  const pipelineEl = container.querySelector('.professional-pipeline');
  if (pipelineEl) {
    pipelineEl.outerHTML = renderTimelinePanel(stepIndex);
  }
}
