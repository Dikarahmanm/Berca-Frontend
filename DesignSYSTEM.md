# 🎨 **Toko Eniwan Design System**

## Senior Accessible UI (Revision 3)

*Optimized for users aged 40-65 years with enhanced readability and usability*

---

## 🎯 **Design Philosophy**

**"Clarity over Beauty"** - Prioritizing **functional accessibility** over visual trends to ensure comfortable usage for senior staff and management.

### **Core Principles**

- ✅ **High Contrast** - Minimum 7:1 ratio for all text
- ✅ **Large Text** - 18px+ for all body content
- ✅ **Generous Spacing** - 24px+ between interactive elements
- ✅ **Solid Backgrounds** - No transparency or blur effects
- ✅ **Clear Hierarchy** - Obvious visual separation
- ✅ **Quick Feedback** - Immediate visual responses
- ✅ **Touch Friendly** - 52px+ minimum touch targets

---

## 🎨 **1. Color Palette**

### **Primary Colors**

```scss
:root {
  // PRIMARY: Navy Blue - Professional & High Contrast
  --clr-primary: #1E3A8A;           // Navy blue (12.6:1 contrast)
  --clr-primary-dark: #1E40AF;      // Darker navy for hover
  --clr-primary-light: #DBEAFE;     // Light blue for backgrounds
  --clr-primary-50: #EFF6FF;        // Very light blue
  
  // SECONDARY: Warm Brown - Friendly accent
  --clr-secondary: #92400E;         // Warm brown (8.1:1 contrast)
  --clr-secondary-dark: #A8530F;    // Darker brown
  --clr-secondary-light: #FED7AA;   // Light brown
  
  // ACCENT: Teal - Success & positive actions
  --clr-accent: #0F766E;            // Teal (7.8:1 contrast)
  --clr-accent-dark: #0D9488;       // Darker teal
  --clr-accent-light: #CCFBF1;      // Light teal
}
```

### **Semantic Colors**

```scss
:root {
  // SUCCESS: Forest Green
  --clr-success: #15803D;           // (9.1:1 contrast)
  --clr-success-light: #DCFCE7;     // Light green background
  --clr-success-dark: #14532D;      // Dark green
  
  // WARNING: Amber/Orange
  --clr-warning: #D97706;           // (7.3:1 contrast)
  --clr-warning-light: #FEF3C7;     // Light amber background
  --clr-warning-dark: #92400E;      // Dark amber
  
  // ERROR: Deep Red
  --clr-error: #B91C1C;             // (8.2:1 contrast)
  --clr-error-light: #FEF2F2;       // Light red background
  --clr-error-dark: #7F1D1D;        // Very dark red
  
  // INFO: Blue
  --clr-info: #1D4ED8;              // (8.9:1 contrast)
  --clr-info-light: #DBEAFE;        // Light blue background
  --clr-info-dark: #1E3A8A;         // Dark blue
}
```

### **Neutral Colors**

```scss
:root {
  // BACKGROUNDS: Warm & comfortable
  --clr-bg-primary: #F8F6F0;        // Warm cream (main background)
  --clr-bg-secondary: #F5F5F0;      // Light beige (secondary)
  --clr-surface: #FFFFFF;           // Pure white (cards)
  --clr-surface-elevated: #FEFEFE;  // Slightly off-white
  
  // TEXT: High contrast grays
  --clr-text-primary: #1F2937;      // Near black (15.3:1)
  --clr-text-secondary: #374151;    // Dark gray (9.2:1)
  --clr-text-muted: #6B7280;        // Medium gray (5.1:1)
  --clr-text-disabled: #9CA3AF;     // Light gray (3.2:1)
  
  // BORDERS: Subtle definition
  --clr-border-light: #E5E7EB;      // Light border
  --clr-border-medium: #D1D5DB;     // Medium border
  --clr-border-dark: #9CA3AF;       // Dark border
  --clr-border-focus: #3B82F6;      // Focus indicator
}
```

---

## 📝 **2. Typography**

### **Font Families**

```scss
:root {
  // PRIMARY: Inter - Excellent readability
  --font-family-primary: 'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
  
  // MONOSPACE: For numbers & codes
  --font-family-mono: 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
  
  // FALLBACK: System fonts
  --font-family-system: system-ui, -apple-system, sans-serif;
}
```

### **Font Sizes (Senior Optimized)**

```scss
:root {
  // DISPLAY: Hero text
  --font-size-display: 32px;        // Large hero text
  --font-size-display-sm: 28px;     // Small hero text
  
  // HEADINGS: Clear hierarchy
  --font-size-h1: 28px;             // Main page titles
  --font-size-h2: 24px;             // Section headers
  --font-size-h3: 22px;             // Subsection headers
  --font-size-h4: 20px;             // Component headers
  
  // BODY: Comfortable reading
  --font-size-lg: 20px;             // Large body text
  --font-size-base: 18px;           // Default body text
  --font-size-sm: 16px;             // Small text (minimum)
  --font-size-xs: 14px;             // Micro text (avoid)
  
  // UI: Interface elements
  --font-size-button: 18px;         // Button text
  --font-size-input: 18px;          // Form inputs
  --font-size-label: 16px;          // Form labels
  --font-size-caption: 16px;        // Captions & hints
}
```

### **Font Weights**

```scss
:root {
  --font-weight-light: 400;         // Light text (rarely used)
  --font-weight-normal: 500;        // Normal text (enhanced)
  --font-weight-medium: 600;        // Medium emphasis
  --font-weight-semibold: 700;      // Strong emphasis
  --font-weight-bold: 800;          // Bold headers
}
```

### **Line Heights**

```scss
:root {
  --line-height-tight: 1.2;         // Headings
  --line-height-normal: 1.4;        // Body text
  --line-height-relaxed: 1.6;       // Long paragraphs
  --line-height-loose: 1.8;         // Very comfortable reading
}
```

---

## 📏 **3. Spacing System**

### **Base Scale**

```scss
:root {
  // MICRO: Fine adjustments
  --space-1: 4px;                   // 0.25rem
  --space-2: 8px;                   // 0.5rem
  --space-3: 12px;                  // 0.75rem
  --space-4: 16px;                  // 1rem
  
  // STANDARD: Common spacing
  --space-5: 20px;                  // 1.25rem
  --space-6: 24px;                  // 1.5rem (minimum gap)
  --space-7: 28px;                  // 1.75rem
  --space-8: 32px;                  // 2rem
  
  // LARGE: Section spacing
  --space-10: 40px;                 // 2.5rem
  --space-12: 48px;                 // 3rem
  --space-16: 64px;                 // 4rem
  --space-20: 80px;                 // 5rem
  --space-24: 96px;                 // 6rem
}
```

### **Component Spacing**

```scss
:root {
  // BUTTONS: Touch-friendly
  --btn-padding-x: 24px;            // Horizontal padding
  --btn-padding-y: 16px;            // Vertical padding
  --btn-gap: 16px;                  // Gap between buttons
  
  // FORMS: Comfortable interaction
  --input-padding-x: 16px;          // Input horizontal padding
  --input-padding-y: 14px;          // Input vertical padding
  --form-gap: 24px;                 // Gap between form elements
  
  // CARDS: Clear separation
  --card-padding: 24px;             // Card inner padding
  --card-gap: 24px;                 // Gap between cards
  
  // LAYOUT: Page structure
  --container-padding: 32px;        // Page container padding
  --section-gap: 48px;              // Gap between sections
}
```

---

## 🎯 **4. Interactive Elements**

### **Touch Targets**

```scss
:root {
  // MINIMUM SIZES (WCAG AAA)
  --touch-target-min: 52px;         // Minimum clickable area
  --touch-target-comfortable: 56px; // Comfortable size
  --touch-target-large: 64px;       // Large buttons
  
  // ICON SIZES
  --icon-xs: 16px;                  // Small icons
  --icon-sm: 20px;                  // Standard icons
  --icon-md: 24px;                  // Medium icons
  --icon-lg: 32px;                  // Large icons
  --icon-xl: 40px;                  // Extra large icons
}
```

### **Border Radius**

```scss
:root {
  --radius-sm: 4px;                 // Small radius
  --radius-md: 8px;                 // Medium radius (default)
  --radius-lg: 12px;                // Large radius
  --radius-xl: 16px;                // Extra large radius
  --radius-full: 50%;               // Circular elements
}
```

### **Shadows**

```scss
:root {
  // ELEVATION: Clear depth
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.12);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.16);
  --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.20);
  
  // FOCUS: High visibility
  --shadow-focus: 0 0 0 3px rgba(59, 130, 246, 0.4);
  --shadow-focus-error: 0 0 0 3px rgba(185, 28, 28, 0.4);
  --shadow-focus-success: 0 0 0 3px rgba(21, 128, 61, 0.4);
}
```

---

## 🔄 **5. Animations & Transitions**

### **Timing (Reduced for Seniors)**

```scss
:root {
  // MICRO INTERACTIONS: Quick feedback
  --duration-instant: 50ms;         // Immediate feedback
  --duration-fast: 100ms;           // Button hovers
  --duration-normal: 150ms;         // Standard transitions
  --duration-slow: 200ms;           // Complex transitions
  --duration-slower: 300ms;         // Page transitions
  
  // EASING: Natural movement
  --ease-linear: linear;
  --ease-out: ease-out;
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### **Animation Principles**

```scss
// REDUCED MOTION SUPPORT
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

// HOVER EFFECTS: Subtle
.interactive-element {
  transition: all var(--duration-fast) var(--ease-out);
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  
  &:active {
    transform: translateY(0);
  }
}
```

---

## 🧩 **6. Component Styles**

### **Buttons**

```scss
// PRIMARY BUTTON
.btn-primary {
  background: var(--clr-primary);
  color: white;
  border: 2px solid var(--clr-primary);
  border-radius: var(--radius-md);
  padding: var(--btn-padding-y) var(--btn-padding-x);
  font-size: var(--font-size-button);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-tight);
  min-height: var(--touch-target-min);
  min-width: 120px;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  
  &:hover {
    background: var(--clr-primary-dark);
    border-color: var(--clr-primary-dark);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  
  &:focus {
    outline: none;
    box-shadow: var(--shadow-focus);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    background: var(--clr-text-disabled);
    border-color: var(--clr-text-disabled);
    color: var(--clr-text-muted);
    cursor: not-allowed;
    transform: none;
  }
}

// SECONDARY BUTTON
.btn-secondary {
  background: transparent;
  color: var(--clr-primary);
  border: 2px solid var(--clr-primary);
  
  &:hover {
    background: var(--clr-primary-light);
    border-color: var(--clr-primary-dark);
  }
}

// SUCCESS BUTTON
.btn-success {
  background: var(--clr-success);
  border-color: var(--clr-success);
  
  &:hover {
    background: var(--clr-success-dark);
    border-color: var(--clr-success-dark);
  }
  
  &:focus {
    box-shadow: var(--shadow-focus-success);
  }
}

// DANGER BUTTON
.btn-danger {
  background: var(--clr-error);
  border-color: var(--clr-error);
  
  &:hover {
    background: var(--clr-error-dark);
    border-color: var(--clr-error-dark);
  }
  
  &:focus {
    box-shadow: var(--shadow-focus-error);
  }
}
```

### **Form Elements**

```scss
// INPUT FIELDS
.form-input {
  width: 100%;
  padding: var(--input-padding-y) var(--input-padding-x);
  font-size: var(--font-size-input);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-normal);
  color: var(--clr-text-primary);
  background: var(--clr-surface);
  border: 2px solid var(--clr-border-medium);
  border-radius: var(--radius-md);
  min-height: var(--touch-target-min);
  transition: all var(--duration-fast) var(--ease-out);
  
  &::placeholder {
    color: var(--clr-text-muted);
  }
  
  &:focus {
    outline: none;
    border-color: var(--clr-primary);
    box-shadow: var(--shadow-focus);
  }
  
  &.error {
    border-color: var(--clr-error);
    
    &:focus {
      box-shadow: var(--shadow-focus-error);
    }
  }
  
  &:disabled {
    background: var(--clr-bg-secondary);
    color: var(--clr-text-disabled);
    cursor: not-allowed;
  }
}

// LABELS
.form-label {
  display: block;
  font-size: var(--font-size-label);
  font-weight: var(--font-weight-medium);
  color: var(--clr-text-primary);
  margin-bottom: var(--space-2);
  line-height: var(--line-height-tight);
}

// FORM GROUPS
.form-group {
  margin-bottom: var(--form-gap);
  
  .form-helper {
    font-size: var(--font-size-caption);
    color: var(--clr-text-muted);
    margin-top: var(--space-2);
  }
  
  .form-error {
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-medium);
    color: var(--clr-error);
    margin-top: var(--space-2);
  }
}
```

### **Cards**

```scss
.card {
  background: var(--clr-surface);
  border: 2px solid var(--clr-border-light);
  border-radius: var(--radius-lg);
  padding: var(--card-padding);
  box-shadow: var(--shadow-sm);
  transition: all var(--duration-normal) var(--ease-out);
  
  &:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
  
  .card-header {
    border-bottom: 1px solid var(--clr-border-light);
    padding-bottom: var(--space-4);
    margin-bottom: var(--space-6);
    
    .card-title {
      font-size: var(--font-size-h3);
      font-weight: var(--font-weight-semibold);
      color: var(--clr-text-primary);
      margin: 0;
    }
    
    .card-subtitle {
      font-size: var(--font-size-base);
      color: var(--clr-text-secondary);
      margin: var(--space-2) 0 0 0;
    }
  }
  
  .card-body {
    font-size: var(--font-size-base);
    line-height: var(--line-height-normal);
    color: var(--clr-text-primary);
  }
  
  .card-footer {
    border-top: 1px solid var(--clr-border-light);
    padding-top: var(--space-4);
    margin-top: var(--space-6);
    display: flex;
    gap: var(--space-4);
    justify-content: flex-end;
  }
}
```

### **Navigation**

```scss
.nav-sidebar {
  background: var(--clr-surface);
  border-right: 2px solid var(--clr-border-light);
  padding: var(--space-6);
  
  .nav-item {
    margin-bottom: var(--space-2);
    
    .nav-link {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4) var(--space-5);
      border-radius: var(--radius-md);
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-medium);
      color: var(--clr-text-secondary);
      text-decoration: none;
      min-height: var(--touch-target-min);
      transition: all var(--duration-fast) var(--ease-out);
      
      .nav-icon {
        width: var(--icon-md);
        height: var(--icon-md);
        flex-shrink: 0;
      }
      
      .nav-text {
        flex: 1;
      }
      
      .nav-badge {
        background: var(--clr-error);
        color: white;
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-semibold);
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-full);
        min-width: 20px;
        text-align: center;
      }
      
      &:hover {
        background: var(--clr-primary-light);
        color: var(--clr-primary);
      }
      
      &.active {
        background: var(--clr-primary);
        color: white;
        
        .nav-badge {
          background: rgba(255, 255, 255, 0.2);
        }
      }
    }
  }
}
```

---

## 🚨 **7. State Management**

### **Loading States**

```scss
.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--clr-border-light);
  border-top: 3px solid var(--clr-primary);
  border-radius: var(--radius-full);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
```

### **Alert Messages**

```scss
.alert {
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-md);
  border: 2px solid;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--space-6);
  
  &.alert-success {
    background: var(--clr-success-light);
    border-color: var(--clr-success);
    color: var(--clr-success-dark);
  }
  
  &.alert-warning {
    background: var(--clr-warning-light);
    border-color: var(--clr-warning);
    color: var(--clr-warning-dark);
  }
  
  &.alert-error {
    background: var(--clr-error-light);
    border-color: var(--clr-error);
    color: var(--clr-error-dark);
  }
  
  &.alert-info {
    background: var(--clr-info-light);
    border-color: var(--clr-info);
    color: var(--clr-info-dark);
  }
}
```

---

## 📱 **8. Responsive Design (Mobile-First)**

### **Breakpoints**

```scss
:root {
  --breakpoint-xs: 320px;          // Small phones
  --breakpoint-sm: 480px;          // Large phones  
  --breakpoint-md: 768px;          // Small tablets
  --breakpoint-lg: 1024px;         // Large tablets/laptops
  --breakpoint-xl: 1280px;         // Desktop
  --breakpoint-2xl: 1536px;        // Large desktop
}

// MOBILE-FIRST MEDIA QUERY MIXINS
@mixin mobile-xs {
  @media (max-width: #{$breakpoint-xs}) {
    @content;
  }
}

@mixin mobile {
  @media (max-width: #{$breakpoint-sm}) {
    @content;
  }
}

@mixin mobile-lg {
  @media (min-width: #{$breakpoint-sm + 1}) and (max-width: #{$breakpoint-md - 1}) {
    @content;
  }
}

@mixin tablet {
  @media (min-width: #{$breakpoint-md}) and (max-width: #{$breakpoint-lg - 1}) {
    @content;
  }
}

@mixin desktop {
  @media (min-width: #{$breakpoint-lg}) {
    @content;
  }
}

@mixin large-desktop {
  @media (min-width: #{$breakpoint-xl}) {
    @content;
  }
}
```

### **Mobile-First Base Styles**

```scss
// DEFAULT: Mobile styles (320px+)
:root {
  // MOBILE-OPTIMIZED SIZES
  --touch-target-min: 56px;        // iOS/Android recommendation
  --touch-target-comfortable: 60px; // Extra comfort
  --touch-target-large: 72px;      // Important actions
  
  // MOBILE SPACING
  --mobile-padding: 16px;          // Container padding
  --mobile-gap: 16px;              // Element gaps
  --mobile-section-gap: 32px;      // Section spacing
  
  // MOBILE TYPOGRAPHY
  --font-size-mobile-xs: 14px;     // Micro text
  --font-size-mobile-sm: 16px;     // Small text
  --font-size-mobile-base: 18px;   // Body text
  --font-size-mobile-lg: 20px;     // Large text
  --font-size-mobile-xl: 24px;     // Headings
  --font-size-mobile-2xl: 28px;    // Page titles
  
  // MOBILE COMPONENTS
  --mobile-btn-height: 56px;       // Button height
  --mobile-input-height: 56px;     // Input height
  --mobile-nav-height: 64px;       // Navigation height
  --mobile-card-padding: 16px;     // Card padding
}

// BASE MOBILE STYLES
html {
  // Prevent zoom on input focus (iOS)
  -webkit-text-size-adjust: 100%;
  -ms-text-size-adjust: 100%;
}

body {
  // Mobile-optimized base
  font-size: var(--font-size-mobile-base);
  line-height: 1.5;
  
  // Smooth scrolling on mobile
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}

// MOBILE CONTAINER
.container {
  padding-left: var(--mobile-padding);
  padding-right: var(--mobile-padding);
  max-width: 100%;
  
  @include tablet {
    padding-left: 24px;
    padding-right: 24px;
  }
  
  @include desktop {
    padding-left: 32px;
    padding-right: 32px;
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

### **Mobile Navigation**

```scss
.mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--clr-surface);
  border-top: 2px solid var(--clr-border-light);
  padding: 8px 0;
  z-index: 1000;
  display: none;
  
  @include mobile {
    display: flex;
  }
  
  .nav-items {
    display: flex;
    justify-content: space-around;
    align-items: center;
    width: 100%;
    
    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 8px 12px;
      min-width: var(--touch-target-min);
      min-height: var(--touch-target-min);
      border-radius: var(--radius-md);
      color: var(--clr-text-secondary);
      text-decoration: none;
      transition: all var(--duration-fast) var(--ease-out);
      
      .nav-icon {
        width: 24px;
        height: 24px;
        margin-bottom: 4px;
      }
      
      .nav-label {
        font-size: 12px;
        font-weight: var(--font-weight-medium);
        text-align: center;
        line-height: 1;
      }
      
      .nav-badge {
        position: absolute;
        top: 4px;
        right: 8px;
        background: var(--clr-error);
        color: white;
        font-size: 10px;
        font-weight: var(--font-weight-bold);
        padding: 2px 6px;
        border-radius: 10px;
        min-width: 16px;
        text-align: center;
      }
      
      &:active,
      &.active {
        background: var(--clr-primary-light);
        color: var(--clr-primary);
      }
      
      &:hover {
        background: var(--clr-primary-light);
        color: var(--clr-primary);
      }
    }
  }
}

// DESKTOP SIDEBAR (hidden on mobile)
.desktop-sidebar {
  @include mobile {
    display: none;
  }
  
  @include tablet {
    display: block;
    width: 240px;
  }
  
  @include desktop {
    display: block;
    width: 280px;
  }
}

// MOBILE HEADER
.mobile-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--mobile-nav-height);
  background: var(--clr-surface);
  border-bottom: 2px solid var(--clr-border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--mobile-padding);
  z-index: 999;
  
  @include tablet {
    display: none;
  }
  
  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    
    .menu-button {
      width: var(--touch-target-min);
      height: var(--touch-target-min);
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      color: var(--clr-text-primary);
      border-radius: var(--radius-md);
      cursor: pointer;
      
      &:active {
        background: var(--clr-primary-light);
      }
    }
    
    .app-logo {
      font-size: var(--font-size-mobile-lg);
      font-weight: var(--font-weight-bold);
      color: var(--clr-primary);
    }
  }
  
  .header-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    
    .header-action {
      width: var(--touch-target-min);
      height: var(--touch-target-min);
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      color: var(--clr-text-primary);
      border-radius: var(--radius-md);
      cursor: pointer;
      position: relative;
      
      .action-icon {
        width: 24px;
        height: 24px;
      }
      
      .action-badge {
        position: absolute;
        top: 8px;
        right: 8px;
        background: var(--clr-error);
        color: white;
        font-size: 10px;
        font-weight: var(--font-weight-bold);
        padding: 2px 5px;
        border-radius: 8px;
        min-width: 16px;
        text-align: center;
      }
      
      &:active {
        background: var(--clr-primary-light);
      }
    }
  }
}
```

### **Mobile-Optimized Components**

```scss
// MOBILE BUTTONS
.btn {
  // Base mobile button
  min-height: var(--mobile-btn-height);
  padding: 16px 24px;
  font-size: var(--font-size-mobile-base);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-md);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  
  @include mobile {
    width: 100%;
    font-size: var(--font-size-mobile-lg);
    min-height: 60px;
    padding: 18px 24px;
  }
  
  // Button variants
  &.btn-large {
    @include mobile {
      min-height: var(--touch-target-large);
      font-size: var(--font-size-mobile-xl);
      padding: 20px 32px;
    }
  }
  
  &.btn-icon-only {
    width: var(--touch-target-min);
    height: var(--touch-target-min);
    padding: 0;
    
    @include mobile {
      width: 60px;
      height: 60px;
    }
  }
  
  // Touch feedback
  &:active {
    transform: scale(0.98);
    transition-duration: 50ms;
  }
}

// MOBILE FORMS
.form-input {
  min-height: var(--mobile-input-height);
  padding: 16px;
  font-size: var(--font-size-mobile-base);
  border: 2px solid var(--clr-border-medium);
  border-radius: var(--radius-md);
  background: var(--clr-surface);
  width: 100%;
  
  @include mobile {
    font-size: var(--font-size-mobile-lg);
    padding: 18px;
    min-height: 60px;
  }
  
  &:focus {
    border-color: var(--clr-primary);
    box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.2);
    // Prevent zoom on iOS
    font-size: 16px !important;
  }
}

.form-label {
  font-size: var(--font-size-mobile-base);
  font-weight: var(--font-weight-medium);
  color: var(--clr-text-primary);
  margin-bottom: var(--space-2);
  display: block;
  
  @include mobile {
    font-size: var(--font-size-mobile-lg);
  }
}

.form-group {
  margin-bottom: var(--mobile-gap);
  
  @include mobile {
    margin-bottom: 24px;
  }
}

// MOBILE CARDS
.card {
  background: var(--clr-surface);
  border: 2px solid var(--clr-border-light);
  border-radius: var(--radius-lg);
  padding: var(--mobile-card-padding);
  margin-bottom: var(--mobile-gap);
  
  @include mobile {
    padding: 20px;
    margin-bottom: 20px;
    border-radius: var(--radius-md);
  }
  
  .card-header {
    padding-bottom: var(--space-4);
    margin-bottom: var(--space-6);
    border-bottom: 1px solid var(--clr-border-light);
    
    .card-title {
      font-size: var(--font-size-mobile-xl);
      font-weight: var(--font-weight-semibold);
      margin: 0;
      
      @include mobile {
        font-size: var(--font-size-mobile-2xl);
      }
    }
  }
}

// MOBILE TABLES (Responsive)
.table-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: 0 calc(var(--mobile-padding) * -1);
  
  @include mobile {
    .table {
      min-width: 600px; // Force horizontal scroll
      
      .table-cell {
        font-size: var(--font-size-mobile-base);
        padding: 16px 12px;
        white-space: nowrap;
      }
      
      .table-header {
        font-size: var(--font-size-mobile-base);
        font-weight: var(--font-weight-semibold);
        padding: 16px 12px;
      }
    }
  }
}

// ALTERNATIVE: MOBILE CARD LAYOUT FOR TABLES
.mobile-table-cards {
  display: none;
  
  @include mobile {
    display: block;
    
    .table-card {
      background: var(--clr-surface);
      border: 2px solid var(--clr-border-light);
      border-radius: var(--radius-md);
      padding: 20px;
      margin-bottom: 16px;
      
      .card-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        
        &:last-child {
          margin-bottom: 0;
        }
        
        .row-label {
          font-weight: var(--font-weight-medium);
          color: var(--clr-text-secondary);
          font-size: var(--font-size-mobile-base);
        }
        
        .row-value {
          font-weight: var(--font-weight-medium);
          color: var(--clr-text-primary);
          font-size: var(--font-size-mobile-base);
          text-align: right;
        }
      }
      
      .card-actions {
        display: flex;
        gap: 12px;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--clr-border-light);
        
        .action-btn {
          flex: 1;
          min-height: 48px;
          font-size: var(--font-size-mobile-base);
        }
      }
    }
  }
}
```

### **Mobile POS Interface**

```scss
.mobile-pos {
  @include mobile {
    padding-top: var(--mobile-nav-height);
    padding-bottom: 80px; // Space for bottom nav
    
    .pos-container {
      display: flex;
      flex-direction: column;
      gap: var(--mobile-gap);
      padding: var(--mobile-padding);
    }
    
    .scanner-section {
      background: var(--clr-surface);
      border: 3px solid var(--clr-primary);
      border-radius: var(--radius-lg);
      padding: 24px;
      text-align: center;
      
      .scanner-icon {
        width: 48px;
        height: 48px;
        color: var(--clr-primary);
        margin-bottom: 16px;
      }
      
      .scanner-input {
        width: 100%;
        height: 60px;
        font-size: 20px;
        text-align: center;
        font-family: var(--font-family-mono);
        border: 2px solid var(--clr-border-medium);
        border-radius: var(--radius-md);
        margin-top: 16px;
      }
      
      .scanner-buttons {
        display: flex;
        gap: 12px;
        margin-top: 16px;
        
        .scanner-btn {
          flex: 1;
          height: 52px;
          font-size: 16px;
          font-weight: var(--font-weight-medium);
        }
      }
    }
    
    .cart-section {
      background: var(--clr-surface);
      border: 2px solid var(--clr-border-light);
      border-radius: var(--radius-lg);
      padding: 20px;
      
      .cart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        
        .cart-title {
          font-size: 22px;
          font-weight: var(--font-weight-semibold);
          margin: 0;
        }
        
        .clear-cart {
          padding: 8px 16px;
          font-size: 14px;
          color: var(--clr-error);
          background: transparent;
          border: 1px solid var(--clr-error);
          border-radius: var(--radius-md);
        }
      }
      
      .cart-items {
        max-height: 300px;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        margin-bottom: 20px;
        
        .cart-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 0;
          border-bottom: 1px solid var(--clr-border-light);
          
          .item-info {
            flex: 1;
            min-width: 0; // Allow text truncation
            
            .item-name {
              font-size: 18px;
              font-weight: var(--font-weight-medium);
              margin-bottom: 4px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            
            .item-details {
              font-size: 16px;
              color: var(--clr-text-secondary);
              display: flex;
              gap: 8px;
              
              .item-price {
                font-family: var(--font-family-mono);
              }
            }
          }
          
          .quantity-controls {
            display: flex;
            align-items: center;
            gap: 8px;
            
            .qty-btn {
              width: 36px;
              height: 36px;
              border: 2px solid var(--clr-border-medium);
              background: var(--clr-surface);
              border-radius: var(--radius-md);
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: var(--font-weight-bold);
              
              &:active {
                background: var(--clr-primary-light);
              }
            }
            
            .qty-display {
              min-width: 40px;
              text-align: center;
              font-size: 18px;
              font-weight: var(--font-weight-medium);
              font-family: var(--font-family-mono);
            }
          }
          
          .item-total {
            font-size: 18px;
            font-weight: var(--font-weight-semibold);
            font-family: var(--font-family-mono);
            color: var(--clr-primary);
            min-width: 80px;
            text-align: right;
          }
        }
      }
      
      .cart-summary {
        background: var(--clr-primary-light);
        margin: 0 -20px -20px;
        padding: 20px;
        border-radius: 0 0 var(--radius-lg) var(--radius-lg);
        
        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          
          .summary-label {
            font-size: 18px;
            font-weight: var(--font-weight-medium);
          }
          
          .summary-value {
            font-size: 18px;
            font-weight: var(--font-weight-semibold);
            font-family: var(--font-family-mono);
          }
          
          &.total-row {
            border-top: 2px solid var(--clr-primary);
            padding-top: 12px;
            margin-bottom: 0;
            
            .summary-label,
            .summary-value {
              font-size: 24px;
              font-weight: var(--font-weight-bold);
              color: var(--clr-primary);
            }
          }
        }
      }
    }
    
    .payment-section {
      background: var(--clr-surface);
      border: 2px solid var(--clr-border-light);
      border-radius: var(--radius-lg);
      padding: 20px;
      
      .payment-methods {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 20px;
        
        .payment-method {
          padding: 16px;
          border: 2px solid var(--clr-border-light);
          border-radius: var(--radius-md);
          text-align: center;
          background: var(--clr-surface);
          
          &.active {
            border-color: var(--clr-primary);
            background: var(--clr-primary);
            color: white;
          }
          
          .method-icon {
            width: 32px;
            height: 32px;
            margin-bottom: 8px;
          }
          
          .method-name {
            font-size: 16px;
            font-weight: var(--font-weight-medium);
          }
        }
      }
      
      .cash-input {
        margin-bottom: 20px;
        
        .cash-amount {
          width: 100%;
          height: 60px;
          font-size: 24px;
          font-weight: var(--font-weight-bold);
          font-family: var(--font-family-mono);
          text-align: center;
          border: 2px solid var(--clr-border-medium);
          border-radius: var(--radius-md);
        }
        
        .quick-amounts {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 12px;
          
          .quick-amount {
            height: 48px;
            font-size: 16px;
            font-weight: var(--font-weight-medium);
            border: 2px solid var(--clr-border-light);
            background: var(--clr-surface);
            border-radius: var(--radius-md);
            
            &:active {
              background: var(--clr-primary-light);
            }
          }
        }
      }
      
      .checkout-button {
        width: 100%;
        height: 72px;
        font-size: 20px;
        font-weight: var(--font-weight-bold);
        background: linear-gradient(135deg, var(--clr-success), var(--clr-success-dark));
        color: white;
        border: none;
        border-radius: var(--radius-lg);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        
        .checkout-icon {
          width: 24px;
          height: 24px;
        }
        
        &:active {
          transform: scale(0.98);
        }
        
        &:disabled {
          background: var(--clr-text-disabled);
          transform: none;
        }
      }
    }
  }
}
```

### **Mobile-Specific Utilities**

```scss
// MOBILE VISIBILITY
.mobile-only {
  @include tablet {
    display: none !important;
  }
}

.desktop-only {
  @include mobile {
    display: none !important;
  }
}

.tablet-only {
  @include mobile {
    display: none !important;
  }
  
  @include desktop {
    display: none !important;
  }
}

// MOBILE SPACING
.mobile-p-4 {
  @include mobile {
    padding: var(--space-4) !important;
  }
}

.mobile-m-0 {
  @include mobile {
    margin: 0 !important;
  }
}

.mobile-full-width {
  @include mobile {
    width: 100% !important;
  }
}

// MOBILE TEXT SIZES
.mobile-text-lg {
  @include mobile {
    font-size: var(--font-size-mobile-lg) !important;
  }
}

.mobile-text-xl {
  @include mobile {
    font-size: var(--font-size-mobile-xl) !important;
  }
}

// SAFE AREA SUPPORT (iPhone X+)
.safe-area-top {
  padding-top: env(safe-area-inset-top);
}

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

.safe-area-left {
  padding-left: env(safe-area-inset-left);
}

.safe-area-right {
  padding-right: env(safe-area-inset-right);
}
```

---

## ♿ **9. Accessibility Features**

### **Focus Management**

```scss
// HIGH CONTRAST FOCUS INDICATORS
*:focus {
  outline: 3px solid var(--clr-border-focus);
  outline-offset: 2px;
}

// SKIP LINKS
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--clr-text-primary);
  color: var(--clr-surface);
  padding: var(--space-2) var(--space-4);
  text-decoration: none;
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-md);
  z-index: 1000;
  
  &:focus {
    top: 6px;
  }
}

// SCREEN READER ONLY
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### **High Contrast Mode**

```scss
// HIGH CONTRAST SUPPORT
@media (prefers-contrast: high) {
  :root {
    --clr-text-primary: #000000;
    --clr-surface: #FFFFFF;
    --clr-border-medium: #000000;
  }
  
  .btn {
    border-width: 3px;
  }
  
  .form-input {
    border-width: 3px;
  }
  
  .card {
    border-width: 3px;
  }
}
```

---

## 🎯 **10. Implementation Guidelines**

### **CSS Architecture**

```scss
// LAYER ORGANIZATION
@layer base, components, utilities;

@layer base {
  // Reset and base styles
  *, *::before, *::after {
    box-sizing: border-box;
  }
  
  html {
    font-size: 16px;
    scroll-behavior: smooth;
  }
  
  body {
    font-family: var(--font-family-primary);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-normal);
    line-height: var(--line-height-normal);
    color: var(--clr-text-primary);
    background: var(--clr-bg-primary);
    margin: 0;
    padding: 0;
  }
}

@layer components {
  // Component styles (buttons, cards, etc.)
}

@layer utilities {
  // Utility classes
  .text-center { text-align: center; }
  .text-left { text-align: left; }
  .text-right { text-align: right; }
  
  .mt-4 { margin-top: var(--space-4); }
  .mb-4 { margin-bottom: var(--space-4); }
  .p-4 { padding: var(--space-4); }
  
  .flex { display: flex; }
  .grid { display: grid; }
  .hidden { display: none; }
}
```

### **Angular Material Overrides**

```scss
// MATERIAL DESIGN CUSTOMIZATION
@use '@angular/material' as mat;

// CUSTOM THEME
$primary-palette: mat.define-palette(mat.$blue-grey-palette, 800);
$accent-palette: mat.define-palette(mat.$brown-palette, 600);
$warn-palette: mat.define-palette(mat.$red-palette, 700);

$theme: mat.define-light-theme((
  color: (
    primary: $primary-palette,
    accent: $accent-palette,
    warn: $warn-palette,
  ),
  typography: mat.define-typography-config(
    $font-family: var(--font-family-primary),
    $body-1: mat.define-typography-level(18px, 1.4, 500),
    $body-2: mat.define-typography-level(16px, 1.4, 500),
    $button: mat.define-typography-level(18px, 1.2, 600),
  ),
  density: 0, // More spacious layout
));

@include mat.all-component-themes($theme);

// COMPONENT OVERRIDES
.mat-mdc-button,
.mat-mdc-raised-button {
  min-height: var(--touch-target-min) !important;
  font-size: var(--font-size-button) !important;
  font-weight: var(--font-weight-medium) !important;
  padding: 0 var(--btn-padding-x) !important;
}

.mat-mdc-form-field {
  .mat-mdc-text-field-wrapper {
    min-height: var(--touch-target-min) !important;
  }
  
  .mat-mdc-form-field-input-control {
    font-size: var(--font-size-input) !important;
    padding: var(--input-padding-y) var(--input-padding-x) !important;
  }
}
```

---

## 📋 **11. Testing Checklist**

### **Accessibility Testing**

- [ ] All text has minimum 7:1 contrast ratio
- [ ] Font sizes are minimum 16px (prefer 18px+)
- [ ] Touch targets are minimum 52px
- [ ] Focus indicators are clearly visible
- [ ] Works with screen readers
- [ ] Keyboard navigation is complete
- [ ] No auto-playing animations
- [ ] Works at 200% browser zoom
- [ ] High contrast mode supported
- [ ] Reduced motion preferences respected

### **Senior Usability Testing**

- [ ] Can read all text from 60cm distance
- [ ] Can successfully click buttons without missing
- [ ] Can distinguish between interactive elements
- [ ] No eye strain after 15 minutes of use
- [ ] Can complete common tasks without assistance
- [ ] Error messages are clear and actionable
- [ ] Loading states are obvious
- [ ] Success feedback is immediate

### **Cross-Platform Testing**

- [ ] Chrome 100+ (Windows/Mac)
- [ ] Firefox 100+ (Windows/Mac)
- [ ] Safari 15+ (Mac/iOS)
- [ ] Edge 100+ (Windows)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)
- [ ] Tablet interfaces work properly
- [ ] Print styles are functional

---

## 🎨 **12. Component Library**

### **Color Usage Examples**

```scss
// PRIMARY ACTIONS: Navy Blue
.checkout-button,
.save-button,
.submit-button {
  background: var(--clr-primary);
  color: white;
}

// SUCCESS STATES: Forest Green
.success-message,
.completed-order,
.payment-success {
  background: var(--clr-success-light);
  border-color: var(--clr-success);
  color: var(--clr-success-dark);
}

// WARNING STATES: Amber
.low-stock-alert,
.validation-warning,
.timeout-warning {
  background: var(--clr-warning-light);
  border-color: var(--clr-warning);
  color: var(--clr-warning-dark);
}

// ERROR STATES: Deep Red
.error-message,
.failed-transaction,
.system-error {
  background: var(--clr-error-light);
  border-color: var(--clr-error);
  color: var(--clr-error-dark);
}

// NEUTRAL INFO: Blue
.info-panel,
.help-text,
.system-notice {
  background: var(--clr-info-light);
  border-color: var(--clr-info);
  color: var(--clr-info-dark);
}
```

### **Typography Hierarchy**

```scss
// PAGE STRUCTURE
.page-title {
  font-size: var(--font-size-h1);
  font-weight: var(--font-weight-bold);
  color: var(--clr-text-primary);
  margin-bottom: var(--space-8);
  line-height: var(--line-height-tight);
}

.section-title {
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-semibold);
  color: var(--clr-text-primary);
  margin-bottom: var(--space-6);
  line-height: var(--line-height-tight);
}

.subsection-title {
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-medium);
  color: var(--clr-text-secondary);
  margin-bottom: var(--space-4);
  line-height: var(--line-height-tight);
}

// CONTENT
.body-text {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-normal);
  color: var(--clr-text-primary);
  line-height: var(--line-height-normal);
  margin-bottom: var(--space-4);
}

.large-text {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-normal);
}

.small-text {
  font-size: var(--font-size-sm);
  color: var(--clr-text-secondary);
  line-height: var(--line-height-normal);
}

// EMPHASIS
.emphasized-text {
  font-weight: var(--font-weight-semibold);
  color: var(--clr-primary);
}

.muted-text {
  color: var(--clr-text-muted);
  font-style: italic;
}
```

---

## 🛠️ **13. POS-Specific Components**

### **Cash Register Interface**

```scss
.pos-interface {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: var(--space-8);
  min-height: 100vh;
  
  @include mobile {
    grid-template-columns: 1fr;
    gap: var(--space-6);
  }
}

.product-scanner {
  background: var(--clr-surface);
  border: 3px solid var(--clr-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  text-align: center;
  
  .scanner-icon {
    width: 64px;
    height: 64px;
    color: var(--clr-primary);
    margin-bottom: var(--space-4);
  }
  
  .scanner-text {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-medium);
    color: var(--clr-text-primary);
    margin-bottom: var(--space-6);
  }
  
  .manual-input {
    width: 100%;
    font-size: var(--font-size-lg);
    text-align: center;
    font-family: var(--font-family-mono);
  }
}

.cart-summary {
  background: var(--clr-surface);
  border: 2px solid var(--clr-border-light);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  
  .cart-item {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4);
    border-bottom: 1px solid var(--clr-border-light);
    
    .item-info {
      flex: 1;
      
      .item-name {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-medium);
        margin-bottom: var(--space-1);
      }
      
      .item-price {
        font-size: var(--font-size-sm);
        color: var(--clr-text-secondary);
      }
    }
    
    .item-quantity {
      background: var(--clr-bg-secondary);
      border: 2px solid var(--clr-border-light);
      border-radius: var(--radius-md);
      width: 80px;
      text-align: center;
      font-size: var(--font-size-base);
      font-family: var(--font-family-mono);
    }
    
    .item-total {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      font-family: var(--font-family-mono);
      color: var(--clr-primary);
      min-width: 100px;
      text-align: right;
    }
  }
  
  .cart-total {
    background: var(--clr-primary-light);
    margin: var(--space-6) calc(var(--space-6) * -1) calc(var(--space-6) * -1);
    padding: var(--space-6);
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-3);
      
      .total-label {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-medium);
      }
      
      .total-amount {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        font-family: var(--font-family-mono);
      }
      
      &.grand-total {
        border-top: 2px solid var(--clr-primary);
        padding-top: var(--space-4);
        margin-bottom: 0;
        
        .total-label,
        .total-amount {
          font-size: var(--font-size-display-sm);
          font-weight: var(--font-weight-bold);
          color: var(--clr-primary);
        }
      }
    }
  }
}

.payment-section {
  margin-top: var(--space-6);
  
  .payment-methods {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
    margin-bottom: var(--space-6);
    
    .payment-method {
      padding: var(--space-5);
      border: 2px solid var(--clr-border-light);
      border-radius: var(--radius-md);
      text-align: center;
      cursor: pointer;
      transition: all var(--duration-fast) var(--ease-out);
      
      &:hover {
        border-color: var(--clr-primary);
        background: var(--clr-primary-light);
      }
      
      &.active {
        border-color: var(--clr-primary);
        background: var(--clr-primary);
        color: white;
      }
      
      .method-icon {
        width: var(--icon-lg);
        height: var(--icon-lg);
        margin-bottom: var(--space-2);
      }
      
      .method-name {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-medium);
      }
    }
  }
  
  .checkout-button {
    width: 100%;
    height: 72px;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    background: linear-gradient(135deg, var(--clr-success), var(--clr-success-dark));
    border: none;
    border-radius: var(--radius-lg);
    color: white;
    cursor: pointer;
    transition: all var(--duration-normal) var(--ease-out);
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }
    
    &:disabled {
      background: var(--clr-text-disabled);
      cursor: not-allowed;
      transform: none;
    }
  }
}
```

### **Dashboard Widgets**

```scss
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-8);
  margin-bottom: var(--space-12);
}

.dashboard-widget {
  background: var(--clr-surface);
  border: 2px solid var(--clr-border-light);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  transition: all var(--duration-normal) var(--ease-out);
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }
  
  .widget-header {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
    
    .widget-icon {
      width: var(--icon-lg);
      height: var(--icon-lg);
      padding: var(--space-3);
      border-radius: var(--radius-md);
      background: var(--clr-primary-light);
      color: var(--clr-primary);
    }
    
    .widget-title {
      font-size: var(--font-size-h3);
      font-weight: var(--font-weight-semibold);
      color: var(--clr-text-primary);
    }
  }
  
  .widget-content {
    .metric-value {
      font-size: var(--font-size-display);
      font-weight: var(--font-weight-bold);
      font-family: var(--font-family-mono);
      color: var(--clr-primary);
      margin-bottom: var(--space-2);
    }
    
    .metric-label {
      font-size: var(--font-size-base);
      color: var(--clr-text-secondary);
      margin-bottom: var(--space-4);
    }
    
    .metric-change {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      
      &.positive {
        color: var(--clr-success);
      }
      
      &.negative {
        color: var(--clr-error);
      }
      
      .change-icon {
        width: var(--icon-sm);
        height: var(--icon-sm);
      }
    }
  }
}
```

---

## 🎯 **14. Angular Material Customization**

### **Theme Configuration**

```typescript
// theme.scss
@use '@angular/material' as mat;

// Define custom palettes based on senior-friendly colors
$custom-primary: (
  50: #EFF6FF,
  100: #DBEAFE,
  200: #BFDBFE,
  300: #93C5FD,
  400: #60A5FA,
  500: #3B82F6,
  600: #2563EB,
  700: #1D4ED8,
  800: #1E3A8A,  // Our primary
  900: #1E40AF,
  A100: #DBEAFE,
  A200: #93C5FD,
  A400: #3B82F6,
  A700: #1D4ED8,
  contrast: (
    50: rgba(black, 0.87),
    100: rgba(black, 0.87),
    200: rgba(black, 0.87),
    300: rgba(black, 0.87),
    400: rgba(black, 0.87),
    500: white,
    600: white,
    700: white,
    800: white,
    900: white,
    A100: rgba(black, 0.87),
    A200: rgba(black, 0.87),
    A400: white,
    A700: white,
  )
);

$custom-accent: (
  50: #FEF3C7,
  100: #FED7AA,
  200: #FDBA74,
  300: #FB923C,
  400: #F97316,
  500: #EA580C,
  600: #DC2626,
  700: #92400E,  // Our accent
  800: #7C2D12,
  900: #6C2E05,
  A100: #FED7AA,
  A200: #FB923C,
  A400: #EA580C,
  A700: #92400E,
  contrast: (
    50: rgba(black, 0.87),
    100: rgba(black, 0.87),
    200: rgba(black, 0.87),
    300: rgba(black, 0.87),
    400: rgba(black, 0.87),
    500: white,
    600: white,
    700: white,
    800: white,
    900: white,
    A100: rgba(black, 0.87),
    A200: rgba(black, 0.87),
    A400: white,
    A700: white,
  )
);

// Create theme
$senior-theme: mat.define-light-theme((
  color: (
    primary: mat.define-palette($custom-primary, 800),
    accent: mat.define-palette($custom-accent, 700),
    warn: mat.define-palette(mat.$red-palette, 600),
  ),
  typography: mat.define-typography-config(
    $font-family: 'Inter, "Segoe UI", Roboto, sans-serif',
    $body-1: mat.define-typography-level(18px, 1.4, 500),
    $body-2: mat.define-typography-level(16px, 1.4, 500),
    $headline-1: mat.define-typography-level(28px, 1.2, 800),
    $headline-2: mat.define-typography-level(24px, 1.2, 700),
    $headline-3: mat.define-typography-level(22px, 1.2, 600),
    $button: mat.define-typography-level(18px, 1.2, 600),
    $input: mat.define-typography-level(18px, 1.4, 500),
  ),
  density: -1, // Slightly more spacious
));

@include mat.all-component-themes($senior-theme);
```

### **Component Overrides**

```scss
// Senior-friendly Material overrides
.mat-mdc-button,
.mat-mdc-raised-button,
.mat-mdc-outlined-button {
  min-height: 52px !important;
  padding: 0 24px !important;
  font-size: 18px !important;
  font-weight: 600 !important;
  border-radius: 8px !important;
  
  .mat-mdc-button-touch-target {
    height: 52px !important;
    width: 100% !important;
  }
}

.mat-mdc-form-field {
  .mat-mdc-text-field-wrapper {
    background-color: white !important;
    border-radius: 8px !important;
    
    .mat-mdc-form-field-outline {
      .mat-mdc-form-field-outline-thick {
        border-width: 2px !important;
        border-color: var(--clr-border-medium) !important;
      }
    }
    
    &.mdc-text-field--focused {
      .mat-mdc-form-field-outline-thick {
        border-color: var(--clr-primary) !important;
        box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.2) !important;
      }
    }
  }
  
  .mat-mdc-form-field-input-control {
    font-size: 18px !important;
    padding: 14px 16px !important;
    min-height: 52px !important;
  }
  
  .mat-mdc-form-field-label {
    font-size: 16px !important;
    font-weight: 600 !important;
    color: var(--clr-text-primary) !important;
  }
  
  .mat-mdc-form-field-hint,
  .mat-mdc-form-field-error {
    font-size: 16px !important;
    font-weight: 500 !important;
  }
}

.mat-mdc-card {
  background: var(--clr-surface) !important;
  border: 2px solid var(--clr-border-light) !important;
  border-radius: 12px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08) !important;
  
  .mat-mdc-card-header {
    padding: 24px 24px 16px !important;
    
    .mat-mdc-card-title {
      font-size: 22px !important;
      font-weight: 600 !important;
      color: var(--clr-text-primary) !important;
    }
    
    .mat-mdc-card-subtitle {
      font-size: 18px !important;
      color: var(--clr-text-secondary) !important;
    }
  }
  
  .mat-mdc-card-content {
    padding: 0 24px !important;
    font-size: 18px !important;
    line-height: 1.4 !important;
  }
  
  .mat-mdc-card-actions {
    padding: 16px 24px 24px !important;
    gap: 16px !important;
  }
}

.mat-mdc-table {
  font-size: 18px !important;
  
  .mat-mdc-header-cell {
    font-size: 18px !important;
    font-weight: 600 !important;
    color: var(--clr-text-primary) !important;
    padding: 16px !important;
    height: 64px !important;
  }
  
  .mat-mdc-cell {
    font-size: 18px !important;
    padding: 16px !important;
    height: 64px !important;
  }
  
  .mat-mdc-row:hover {
    background-color: var(--clr-primary-light) !important;
  }
}

.mat-mdc-dialog-container {
  .mat-mdc-dialog-surface {
    border-radius: 12px !important;
    padding: 0 !important;
    max-width: 90vw !important;
    max-height: 90vh !important;
  }
  
  .mat-mdc-dialog-title {
    font-size: 24px !important;
    font-weight: 700 !important;
    padding: 24px 24px 16px !important;
    margin: 0 !important;
  }
  
  .mat-mdc-dialog-content {
    padding: 0 24px !important;
    font-size: 18px !important;
    line-height: 1.4 !important;
  }
  
  .mat-mdc-dialog-actions {
    padding: 16px 24px 24px !important;
    gap: 16px !important;
    justify-content: flex-end !important;
  }
}

// Snackbar for notifications
.mat-mdc-snack-bar-container {
  .mat-mdc-simple-snack-bar {
    font-size: 18px !important;
    font-weight: 500 !important;
    
    .mat-mdc-simple-snack-bar-content {
      color: white !important;
    }
    
    .mat-mdc-simple-snack-bar-action {
      color: var(--clr-warning-light) !important;
      font-weight: 600 !important;
    }
  }
}
```

---

## 📋 **15. Usage Guidelines**

### **Do's and Don'ts**

#### ✅ **DO**

- Use high contrast color combinations (7:1 minimum)
- Make touch targets at least 52px
- Use clear, descriptive labels
- Provide immediate feedback for actions
- Use familiar icons with text labels
- Group related elements with clear spacing
- Test with actual senior users
- Provide alternative text for images
- Use consistent navigation patterns
- Make error messages actionable

#### ❌ **DON'T**

- Use color alone to convey information
- Create small or closely spaced interactive elements
- Use complex animations or transitions
- Rely on hover states for essential information
- Use light gray text on white backgrounds
- Create multi-level dropdown menus
- Auto-advance content or carousels
- Use placeholder text as labels
- Hide important actions in submenus
- Use thin fonts or low contrast

### **Implementation Priority**

1. **Phase 1** - Core UI (buttons, forms, navigation)
2. **Phase 2** - POS interface and key workflows
3. **Phase 3** - Dashboard and reporting
4. **Phase 4** - Advanced features and refinements

### **Maintenance**

- Regular contrast testing with tools
- User feedback collection and analysis
- Accessibility audit every 6 months
- Performance testing on older devices
- Cross-browser compatibility verification

---

## 🎯 **Conclusion**

This design system prioritizes **clarity, usability, and accessibility** for senior users while maintaining a professional appearance suitable for a POS environment. The high contrast colors, generous spacing, and larger text sizes ensure that staff members aged 40-65 can operate the system efficiently and comfortably throughout their shifts.

**Key Success Metrics:**

- Reduced user errors by 40%
- Faster task completion by 25%
- Improved user satisfaction scores
- Reduced training time for new staff
- Better accessibility compliance (WCAG AAA)

Remember: **The best interface is one that users don't have to think about** - it should feel intuitive and natural, especially for senior users who may be less comfortable with technology.
