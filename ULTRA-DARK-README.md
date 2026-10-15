# Refract Ultra Dark Design

## 🎨 Design Inspirado no Cluely (Versão Dark Premium)

Este é um redesign completo do site do Refract, inspirado no design limpo e moderno do Cluely, mas adaptado para uma estética **ultra dark** e premium.

## 📁 Arquivos

- `index-ultra.html` - Página principal com todas as seções
- `ultra-dark.css` - Design system completo (622 linhas)
- `ultra-dark.js` - JavaScript com animações e interatividade (290 linhas)

## ✨ Características Principais

### Design System
- **Cores Ultra Dark**: Background #000000 / #020204 com gradientes sutis
- **Glassmorphism Avançado**: backdrop-filter blur(32px) com bordas sutis
- **Gradientes Vibrantes**: Blue (#3b82f6) → Purple (#8b5cf6) → Pink (#ec4899)
- **Shadows Premium**: Múltiplas camadas com glow effects
- **Tipografia**: Plus Jakarta Sans (display) + JetBrains Mono (code)

### Seções Implementadas

#### 1. **Navigation Bar**
- Glass morphism com blur
- Sticky com scroll behavior
- Links de navegação + CTAs
- Badge de versão

#### 2. **Hero Section**
- Título grande com gradient text
- Badge animado com pulse
- Descrição com highlight code
- 2 CTAs (Download + Learn More)
- Meta strip com GitHub stars
- Device mockup com glass window interativa

#### 3. **Window Mockup Interativa**
- 3 cenários intercambiáveis:
  - 💻 Technical Interview
  - 📊 Executive Meeting  
  - 🏗️ System Design
- Audio stream bars animados
- Mensagens com AI assistant
- Live insights destacados

#### 4. **Stats Section**
- 4 cards com métricas principais
- Animação on scroll
- Hover effects

#### 5. **Features Section** (Bento Grid)
- 6 cards em grid responsivo:
  - ⚡ Real-time Intelligence (large)
  - 👁️ Screen Intelligence (small)
  - 🔒 Privacy First (small)
  - 🧠 Semantic Memory (small)
  - 🥷 Stealth Mode (medium)
  - 🤖 Multi-model Router (medium)
- Hover effects com elevation
- Feature lists com checkmarks

#### 6. **Pricing Section**
- 3 planos: Free, Pro (featured), Enterprise
- Cards com glassmorphism
- Featured plan destacado
- CTAs específicos por plano

#### 7. **CTA Banner**
- Background com gradient overlay
- Título com gradient text
- 2 CTAs (Download + GitHub)

#### 8. **Footer**
- 4 colunas: Product, Resources, Company, Legal
- Links organizados
- Copyright bar

## 🎭 Animações

### CSS Animations
- `fade-in-up` - Reveal suave dos elementos
- `pulse` - Status dots e badges
- `float-slow` / `float-reverse` - Background glows
- `wave` - Audio visualizer bars
- `slide-in` - Mensagens do chat

### JavaScript Interactions
- **Scroll animations**: Intersection Observer para reveals
- **Parallax effect**: Mouse move nos glows de fundo
- **Scenario switching**: Tabs interativas no window mockup
- **Smooth scroll**: Para anchor links
- **Nav behavior**: Sticky com classe ao scroll

## 🎨 Paleta de Cores

```css
/* Dark Base */
--bg-black: #000000;
--bg-void: #020204;
--bg-deep: #0a0a0f;
--bg-surface: #0f0f14;

/* Glass Surfaces */
--glass-1: rgba(255, 255, 255, 0.02);
--glass-2: rgba(255, 255, 255, 0.04);
--glass-3: rgba(255, 255, 255, 0.06);

/* Accents */
--accent-blue: #3b82f6;
--accent-purple: #8b5cf6;
--accent-cyan: #06b6d4;
--accent-emerald: #10b981;
--accent-pink: #ec4899;

/* Text */
--text-primary: #ffffff;
--text-secondary: #e5e5e8;
--text-muted: #9ca3af;
```

## 🚀 Como Usar

1. Abra `index-ultra.html` em um navegador moderno
2. Navegue pelas seções
3. Teste as interações:
   - Troque entre cenários no window mockup
   - Observe as animações ao scroll
   - Mova o mouse para ver o parallax
   - Teste os hovers nos cards

## 📱 Responsividade

- **Desktop**: Layout completo com bento grid
- **Tablet**: Grid adaptativo, nav simplificada
- **Mobile**: Single column, buttons full-width

## 🎯 Melhorias vs. Original

### Visual
- ✅ Background mais escuro e atmosférico
- ✅ Gradientes mais vibrantes
- ✅ Glassmorphism mais pronunciado
- ✅ Sombras e glows premium
- ✅ Tipografia mais impactante

### Estrutura
- ✅ Bento grid ao invés de grid simples
- ✅ Featured pricing card
- ✅ Footer estruturado
- ✅ Sections bem definidas

### Interatividade
- ✅ Window mockup dinâmica
- ✅ Scroll reveals progressivos
- ✅ Parallax effect
- ✅ Smooth transitions
- ✅ Hover states refinados

## 🔮 Próximos Passos

Para expandir ainda mais:

1. **Blog Section** - Cards de artigos com thumbnails
2. **Testimonials** - Depoimentos com avatars
3. **Video Demo** - Player integrado
4. **FAQ Accordion** - Perguntas frequentes expansíveis
5. **Use Cases** - Páginas detalhadas para cada caso de uso
6. **Documentation** - Portal de docs integrado
7. **Mobile Menu** - Hamburguer menu para mobile
8. **Dark/Light Toggle** - (opcional, mas o dark já é premium)

## 🛠️ Tecnologias

- **HTML5** - Semântico e acessível
- **CSS3** - Custom properties, grid, flexbox, backdrop-filter
- **Vanilla JS** - Zero dependências
- **Fonts**: Google Fonts (Plus Jakarta Sans, JetBrains Mono)

## 📝 Notas

- Todos os assets (icon.png) devem estar na pasta `../assets/`
- JavaScript é progressivo (funciona sem JS mas melhor com)
- Todas as animações respeitam `prefers-reduced-motion`
- Links de navegação apontam para anchors na mesma página
- CTAs apontam para `download.html` e GitHub (ajustar conforme necessário)

---

**Feito com ❤️ para o Refract**
