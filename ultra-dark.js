// ==========================================================================
// REFRACT ULTRA DARK — INTERACTIVE BEHAVIORS
// ==========================================================================

// Navigation scroll behavior
const nav = document.getElementById('main-nav');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const currentScroll = window.pageYOffset;
  
  if (currentScroll > 100) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
  
  lastScroll = currentScroll;
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Intersection Observer for reveal animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

// Observe elements with reveal animation
document.querySelectorAll('[data-reveal]').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
  observer.observe(el);
});

// Dynamic window content with scenarios
const scenarios = {
  technical: {
    title: '💻 Technical Interview',
    messages: [
      {
        speaker: 'Interviewer',
        text: 'Can you explain how you would implement a rate limiter?',
        time: '14:32:10'
      },
      {
        speaker: 'Assistant',
        text: 'A token bucket algorithm would be ideal here. You maintain a bucket with tokens, refilled at a constant rate...',
        time: '14:32:12',
        isAI: true
      },
      {
        speaker: 'You',
        text: 'Exactly. I would use a token bucket with Redis for distributed rate limiting. Each request consumes a token...',
        time: '14:32:18'
      },
      {
        speaker: 'Assistant',
        text: 'Consider mentioning: sliding window for precise limits, atomic operations in Redis (INCR, EXPIRE), and fallback strategies.',
        time: '14:32:20',
        isAI: true,
        isHint: true
      }
    ]
  },
  executive: {
    title: '📊 Executive Meeting',
    messages: [
      {
        speaker: 'CEO',
        text: 'What are the Q4 projections for our cloud infrastructure costs?',
        time: '09:15:22'
      },
      {
        speaker: 'Assistant',
        text: 'Based on current usage trends: ~$240K/month. Key drivers: EC2 instances (+15%), S3 storage (+8%).',
        time: '09:15:24',
        isAI: true
      },
      {
        speaker: 'You',
        text: 'Around $240K monthly. We can optimize with spot instances and S3 lifecycle policies...',
        time: '09:15:30'
      }
    ]
  },
  design: {
    title: '🏗️ System Design',
    messages: [
      {
        speaker: 'Interviewer',
        text: 'How would you design a URL shortener like bit.ly?',
        time: '15:45:08'
      },
      {
        speaker: 'Assistant',
        text: 'Core components: Hash generator (base62), Redis cache, PostgreSQL for persistence, rate limiting, analytics.',
        time: '15:45:10',
        isAI: true
      },
      {
        speaker: 'You',
        text: 'I would start with a hash-based approach using base62 encoding for short URLs...',
        time: '15:45:16'
      }
    ]
  }
};

let currentScenario = 'technical';

function renderWindowContent() {
  const content = scenarios[currentScenario];
  const container = document.getElementById('window-content');
  
  if (!container) return;
  
  const html = `
    <div style="display: flex; flex-direction: column; gap: 1rem; height: 100%;">
      <!-- Audio Stream Bar -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; background: var(--glass-2); backdrop-filter: blur(12px); border: 1px solid var(--border-subtle); border-radius: 0.75rem;">
        <div style="display: flex; align-items: center; gap: 1rem;">
          <span style="font-size: 1.25rem;">🎙️</span>
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            <span style="font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);">Mic: Built-in Array</span>
            <div style="display: flex; gap: 2px;">
              ${[...Array(8)].map((_, i) => `
                <div style="width: 3px; height: ${8 + Math.random() * 12}px; background: var(--accent-blue); border-radius: 2px; animation: wave ${0.5 + Math.random() * 0.5}s ease-in-out infinite alternate;"></div>
              `).join('')}
            </div>
          </div>
        </div>
        
        <div style="display: flex; align-items: center; gap: 1rem;">
          <span style="font-size: 1.25rem;">🔊</span>
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            <span style="font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);">System: Zoom</span>
            <div style="display: flex; gap: 2px;">
              ${[...Array(8)].map((_, i) => `
                <div style="width: 3px; height: ${6 + Math.random() * 10}px; background: var(--accent-purple); border-radius: 2px; animation: wave ${0.6 + Math.random() * 0.4}s ease-in-out infinite alternate;"></div>
              `).join('')}
            </div>
          </div>
        </div>
        
        <div style="padding: 0.5rem 1rem; background: var(--glass-2); border: 1px solid var(--border-soft); border-radius: 0.5rem; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem;">
          <span style="color: var(--accent-blue-bright);">✦</span>
          Claude 3.5 Sonnet
        </div>
      </div>
      
      <!-- Scenario Tabs -->
      <div style="display: flex; gap: 0.5rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.5rem;">
        <button onclick="changeScenario('technical')" class="scenario-btn ${currentScenario === 'technical' ? 'active' : ''}" style="padding: 0.5rem 1rem; background: ${currentScenario === 'technical' ? 'var(--glass-3)' : 'transparent'}; border: 1px solid ${currentScenario === 'technical' ? 'var(--border-medium)' : 'transparent'}; border-radius: 0.5rem; color: var(--text-secondary); font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
          💻 Technical Interview
        </button>
        <button onclick="changeScenario('executive')" class="scenario-btn ${currentScenario === 'executive' ? 'active' : ''}" style="padding: 0.5rem 1rem; background: ${currentScenario === 'executive' ? 'var(--glass-3)' : 'transparent'}; border: 1px solid ${currentScenario === 'executive' ? 'var(--border-medium)' : 'transparent'}; border-radius: 0.5rem; color: var(--text-secondary); font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
          📊 Executive Meeting
        </button>
        <button onclick="changeScenario('design')" class="scenario-btn ${currentScenario === 'design' ? 'active' : ''}" style="padding: 0.5rem 1rem; background: ${currentScenario === 'design' ? 'var(--glass-3)' : 'transparent'}; border: 1px solid ${currentScenario === 'design' ? 'var(--border-medium)' : 'transparent'}; border-radius: 0.5rem; color: var(--text-secondary); font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
          🏗️ System Design
        </button>
      </div>
      
      <!-- Messages -->
      <div style="flex: 1; display: flex; flex-direction: column; gap: 1rem; overflow-y: auto; padding-right: 0.5rem;">
        ${content.messages.map(msg => `
          <div style="display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem 1.25rem; background: ${msg.isAI ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.08))' : 'var(--glass-2)'}; border: 1px solid ${msg.isAI ? 'var(--accent-blue)' : 'var(--border-subtle)'}; border-left: ${msg.isHint ? '3px solid var(--accent-emerald)' : 'none'}; border-radius: 0.75rem; animation: slide-in 0.4s ease-out;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 0.8125rem; font-weight: 700; color: ${msg.isAI ? 'var(--accent-blue-bright)' : 'var(--text-primary)'};">
                ${msg.isAI ? '🤖 Refract Assistant' : msg.speaker}
              </span>
              <span style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--text-subtle);">${msg.time}</span>
            </div>
            <p style="font-size: 0.9375rem; line-height: 1.6; color: var(--text-secondary); margin: 0;">
              ${msg.text}
            </p>
            ${msg.isHint ? '<span style="font-size: 0.75rem; color: var(--accent-emerald); font-weight: 600; margin-top: 0.25rem;">💡 Live Insight</span>' : ''}
          </div>
        `).join('')}
      </div>
    </div>
    
    <style>
      @keyframes wave {
        to { height: ${4 + Math.random() * 6}px; }
      }
      @keyframes slide-in {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      .scenario-btn:hover {
        background: var(--glass-2) !important;
      }
    </style>
  `;
  
  container.innerHTML = html;
}

window.changeScenario = (scenario) => {
  currentScenario = scenario;
  renderWindowContent();
};

// Initialize window content
document.addEventListener('DOMContentLoaded', () => {
  renderWindowContent();
  
  // Animate stats on scroll
  const statCards = document.querySelectorAll('.ultra-stat-card');
  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, index * 100);
      }
    });
  }, { threshold: 0.2 });
  
  statCards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    statsObserver.observe(card);
  });
});

// Parallax effect for background glows
window.addEventListener('mousemove', (e) => {
  const glows = document.querySelectorAll('[class^="ultra-glow-"]');
  const x = e.clientX / window.innerWidth;
  const y = e.clientY / window.innerHeight;
  
  glows.forEach((glow, index) => {
    const speed = (index + 1) * 10;
    const xOffset = (x - 0.5) * speed;
    const yOffset = (y - 0.5) * speed;
    glow.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
  });
});

// Copy to clipboard functionality
function copyToClipboard(text, button) {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = button.textContent;
    button.textContent = '✓ Copied!';
    button.style.background = 'var(--accent-emerald)';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '';
    }, 2000);
  });
}

// Expose to global scope if needed
window.copyToClipboard = copyToClipboard;

console.log('🚀 Refract Ultra Dark loaded successfully');
