# Deploy Feature - Comprehensive Test Scenarios with Design Validation

## Test Environment Configuration

### Prerequisites
- Multiple test user accounts with different roles
- Platform API keys generated for each user
- Test agents with various configurations
- Multiple browser environments (Chrome, Firefox, Safari)
- Mobile device emulators
- Color picker/inspector tool for design verification
- Network throttling capabilities for performance testing

### Test User Accounts
| User | Email | Role | Department | Purpose |
|------|-------|------|------------|---------|
| Alice | alice@test.com | Developer | Engineering | Agent owner |
| Bob | bob@test.com | Developer | Engineering | Team member |
| Charlie | charlie@test.com | Developer | Marketing | Different department |
| David | david@test.com | User | None | Public user |
| Admin | admin@test.com | Admin | Platform | System administrator |

### Color Reference Guide
| Mode | Primary | Background Light | Background Dark | Status |
|------|---------|------------------|-----------------|---------|
| Workbench | #EA2831 | #f8f6f6 | #211111 | Development/Testing |
| Hub | #359EFF | #f5f7f8 | #0f1923 | Production/Public |
| Flow | #FAC638 | #f8f8f5 | #231e0f | Orchestration |

---

## SCENARIO 1: Workbench Agent Creation with Complete UI/UX Validation

### User Story
As a developer, I want a seamless and visually consistent experience when creating agents in Workbench.

### Detailed Test Steps

#### 1.1 Initial Navigation and Visual Consistency
1. **Login** as alice@test.com
2. **Verify** platform header shows correct user info
3. **Navigate** to Workbench via sidebar
4. **Check** sidebar active state:
   - Background color: `rgba(234, 40, 49, 0.1)` (dark mode) or `var(--color-workbench-bg-light)` (light mode)
   - Text color: `#EA2831` (Workbench red)
   - Border-left: 3px solid #EA2831
   - Transition: smooth 150ms ease-in-out
5. **Verify** page header:
   - Title: "My Development Agents"
   - Font: text-4xl font-black
   - Color: text-gray-900 dark:text-white
   - Letter-spacing: tracking-[-0.033em]

#### 1.2 Agent Grid Layout Validation
1. **Check** grid layout:
   - Grid columns: `grid-cols-[repeat(auto-fill,minmax(280px,1fr))]`
   - Gap: 3 units (12px)
   - Responsive: adjusts to screen width
2. **Verify** "Add New Agent" card:
   - Min height: 198px
   - Border: 2px dashed, color: border-gray-300 dark:border-gray-700
   - Background: bg-gray-50 dark:bg-black/20
   - Hover state:
     - Border color transitions to #EA2831
     - Text color transitions to #EA2831
     - Scale: 1.02 transform
     - Shadow: 0 4px 6px rgba(234, 40, 49, 0.1)
   - Plus icon size: h-12 w-12
   - Text: "Add New Agent" (text-base font-semibold)

#### 1.3 Modal Creation Flow
1. **Click** "Add New Agent" card
2. **Verify** modal appearance:
   - Backdrop: bg-black/50 with fade-in animation
   - Modal: slide-up animation (200ms)
   - Width: max-w-2xl
   - Border-radius: rounded-xl
   - Shadow: shadow-2xl
3. **Check** modal header:
   - Title font: text-2xl font-bold
   - Close button: hover:bg-gray-100 dark:hover:bg-gray-700
   - X icon: h-5 w-5 text-gray-500
4. **Validate** form fields:
   - Labels: text-sm font-medium text-gray-700
   - Inputs: border-gray-300 focus:border-workbench-primary
   - Focus ring: ring-2 ring-workbench-primary/50
   - Error states: border-red-500 with red text below

#### 1.4 Form Field Validation
1. **Test** each field:
   - Name: Required, max 100 chars, unique validation
   - Framework dropdown: ADK, Agno, Custom options
   - Description: Optional, max 500 chars, character counter
   - Department: Auto-populated from user profile
2. **Verify** real-time validation:
   - Debounce: 300ms for name uniqueness check
   - Error messages: text-sm text-red-600 dark:text-red-400
   - Success indicators: green checkmark with fade-in

#### 1.5 Submission and Feedback
1. **Click** "Create Agent" button
2. **Verify** button states:
   - Default: bg-workbench-primary hover:opacity-90
   - Loading: spinner animation + disabled state
   - Success: brief green flash before modal close
3. **Check** success notification:
   - Position: top-right
   - Background: bg-green-500
   - Animation: slide-in from right
   - Auto-dismiss: 3 seconds

### Expected Visual Results
- Consistent Workbench red (#EA2831) theming
- Smooth transitions and animations
- Proper spacing and alignment
- Responsive layout adjustments
- Clear visual hierarchy

---

## SCENARIO 2: Agent Card Design and Interaction States

### User Story
As a user, I want agent cards to be visually appealing and provide clear status information.

### Detailed Test Steps

#### 2.1 Agent Card Visual Structure
1. **Inspect** newly created agent card:
   - Size: min-height 198px
   - Border: 1px solid border-gray-200
   - Border-radius: rounded-xl
   - Shadow: shadow-sm hover:shadow-lg
   - Background: dynamic based on card_color or default white
2. **Verify** card header:
   - Agent name: text-lg font-bold
   - Truncation: max 2 lines with ellipsis
   - Framework badge position: top-right
   - Status badge position: top-left

#### 2.2 Status Badge Design
1. **Check** DEVELOPMENT status badge:
   - Background: bg-gray-800/20 (light) or bg-white/20 (dark)
   - Text: text-gray-800 (light) or text-white (dark)
   - Border: 1px solid with 30% opacity
   - Padding: px-2.5 py-0.5
   - Border-radius: rounded-full
   - Font: text-xs font-semibold
   - Animation: subtle pulse on hover

#### 2.3 Framework Badge Design
1. **Verify** ADK framework badge:
   - Background: bg-blue-100 dark:bg-blue-900/50
   - Text: text-blue-800 dark:text-blue-200
   - Icon: appropriate framework icon
   - Size: text-xs
   - Position: absolute top-2 right-2

#### 2.4 Card Content Area
1. **Check** description section:
   - Max lines: 3 with fade-out gradient
   - Font: text-sm text-gray-600
   - Line-height: 1.5
   - Padding: p-4
2. **Verify** metadata section:
   - Owner: icon + username
   - Department: icon + department name
   - Created: relative time (e.g., "2 hours ago")
   - Font: text-xs text-gray-500

#### 2.5 Action Buttons Row
1. **Inspect** button layout:
   - Container: flex justify-between items-center
   - Padding: px-4 pb-3
   - Gap: space-x-2
2. **Check** Deploy button:
   - Background: #EA2831 (Workbench red)
   - Text: white, font-medium
   - Icon: Rocket icon (h-4 w-4)
   - Hover: opacity-90 with scale(1.05)
   - Disabled state: opacity-50 cursor-not-allowed
3. **Verify** other action buttons:
   - Edit: text-gray-600 hover:text-gray-800
   - Delete: text-red-600 hover:text-red-800
   - Size: p-2 rounded-lg
   - Hover background: bg-gray-100

#### 2.6 Card Hover and Active States
1. **Hover** over card:
   - Shadow transition: shadow-sm → shadow-lg
   - Transform: translateY(-2px)
   - Duration: 200ms ease-in-out
   - Cursor: pointer for clickable area
2. **Click** card to select:
   - Border highlight: 2px solid #EA2831
   - Background tint: rgba(234, 40, 49, 0.02)
   - Selection indicator: checkmark in corner

### Expected Visual Results
- Clean, modern card design
- Clear visual hierarchy
- Consistent spacing and typography
- Smooth hover transitions
- Accessible contrast ratios

---

## SCENARIO 3: Chat Playground Layout and Configuration Panel

### User Story
As a developer, I want an intuitive chat interface with clear configuration options.

### Detailed Test Steps

#### 3.1 Two-Column Layout Validation
1. **Click** on agent card to open playground
2. **Verify** layout structure:
   - Grid: md:grid-cols-3 (2:1 ratio)
   - Gap: gap-2 (8px)
   - Height: h-full overflow-hidden
   - Responsive: stacks on mobile (grid-cols-1)
3. **Check** back button:
   - Position: top-left of layout
   - Icon: ArrowLeft (h-4 w-4)
   - Text: "Back to Agents"
   - Color: text-gray-600 hover:text-primary
   - Separator: h-6 w-px bg-border-light

#### 3.2 Chat Panel Design
1. **Inspect** chat container:
   - Background: bg-panel-light dark:bg-panel-dark
   - Border: 1px solid border-border-light
   - Border-radius: rounded-lg
   - Column span: md:col-span-2
2. **Verify** chat header:
   - Height: h-16
   - Border-bottom: 2px solid #EA2831
   - Background tint: rgba(234, 40, 49, 0.02)
   - Title: "Chat Playground" in Workbench red
   - Agent name subtitle: text-xs text-gray-500
3. **Check** message area:
   - Padding: p-4
   - Scroll: overflow-y-auto with custom scrollbar
   - Max height: calc(100vh - 200px)
   - Message bubbles:
     - User: bg-primary text-white rounded-lg
     - Agent: bg-gray-100 dark:bg-gray-700 rounded-lg
     - Padding: px-4 py-2
     - Max-width: 70%
     - Time stamps: text-xs text-gray-400

#### 3.3 Configuration Panel Design
1. **Inspect** config panel:
   - Background: bg-white dark:bg-gray-800
   - Border: 1px solid border-gray-200
   - Sections: collapsible with smooth animations
2. **Verify** endpoint configuration:
   - Label: "Agent Endpoint" (font-medium)
   - Generated URL display:
     - Background: bg-gray-50 dark:bg-gray-900
     - Font: font-mono text-sm
     - Copy button: hover:bg-gray-200
     - Trace ID highlighted: text-primary font-bold
3. **Check** host input field:
   - Placeholder: "https://your-agent.com/api"
   - Validation indicators:
     - Valid: green border and checkmark
     - Invalid: red border and error text
     - Loading: spinner on right side
4. **Test** connection button:
   - Default: bg-primary text-white
   - Testing: spinner + "Testing..."
   - Success: green bg + "Connected!"
   - Failure: red bg + error message
   - Animation: 300ms color transition

#### 3.4 Input Area Design
1. **Verify** chat input container:
   - Position: sticky bottom-0
   - Background: bg-white dark:bg-gray-800
   - Border-top: 1px solid border-gray-200
   - Padding: p-4
2. **Check** input field:
   - Multi-line support: min-h-[80px] max-h-[200px]
   - Placeholder: "Type your message..."
   - Focus state: ring-2 ring-primary
   - Auto-resize: based on content
3. **Inspect** send button:
   - Position: absolute right-4 bottom-4
   - Color: bg-primary hover:bg-primary/90
   - Icon: Send (h-5 w-5)
   - Disabled: when empty or sending
   - Loading: spinner replaces icon

### Expected Visual Results
- Clean separation between chat and config
- Workbench red accents throughout
- Responsive layout adjustments
- Clear visual feedback for all interactions
- Consistent spacing and alignment

---

## SCENARIO 4: Deploy Modal Design and Interaction Flow

### User Story
As a developer, I want a clear and intuitive deployment interface with proper scope selection.

### Detailed Test Steps

#### 4.1 Deploy Button and Modal Trigger
1. **Locate** Deploy button on agent card
2. **Verify** button design:
   - Background: #EA2831 (Workbench red)
   - Text: "Deploy" with Rocket icon
   - Padding: px-4 py-2
   - Border-radius: rounded-lg
   - Hover: opacity-90 + slight scale
   - Active: scale(0.98)
3. **Click** Deploy button
4. **Check** modal animation:
   - Backdrop fade-in: 200ms
   - Modal slide-up: 300ms ease-out
   - Initial focus: first interactive element

#### 4.2 Modal Layout and Structure
1. **Inspect** modal container:
   - Max-width: max-w-lg (512px)
   - Background: bg-white dark:bg-gray-800
   - Border-radius: rounded-xl
   - Shadow: shadow-2xl
   - Padding: p-6
2. **Verify** modal header:
   - Title: "Deploy Agent" (text-xl font-bold)
   - Agent name: displayed as subtitle
   - Close button: X icon with hover state
   - Border-bottom: 1px solid border-gray-200

#### 4.3 Agent Information Display
1. **Check** agent info section:
   - Background: bg-gray-50 dark:bg-gray-900/50
   - Border-radius: rounded-lg
   - Padding: p-4
   - Margin: mb-6
2. **Verify** info fields:
   - Name: font-medium text-gray-900
   - Framework: badge style matching card
   - Endpoint: font-mono text-sm truncate
   - Current Status: colored badge
   - Layout: label-value pairs with consistent spacing

#### 4.4 Deployment Scope Selection
1. **Inspect** scope options container:
   - Title: "Deployment Scope" (text-sm font-medium)
   - Options layout: space-y-2
2. **Check** Team scope option:
   - Container: border rounded-lg p-3
   - Radio button: custom styled
   - Icon: Users icon in #EA2831
   - Title: "Team Only" (font-medium)
   - Description: text-sm text-gray-500
   - Hover: bg-gray-50 dark:bg-gray-700/50
   - Selected: border-2 border-primary
   - Transition: 150ms all
3. **Verify** Public scope option:
   - Icon: Globe icon in #359EFF
   - Title: "Public"
   - Description: "Available to all platform users"
   - Visual distinction from Team option
4. **Test** Custom scope option:
   - Icon: Shield icon
   - Additional UI: user selection field appears
   - User input: auto-complete with debounce
   - User chips: removable tags with X button

#### 4.5 Validation Messages and Warnings
1. **Check** endpoint validation warning:
   - Condition: no endpoint configured
   - Background: bg-yellow-50 dark:bg-yellow-900/20
   - Border: border-l-4 border-yellow-500
   - Icon: AlertCircle in yellow
   - Message: clear, actionable text
2. **Verify** localhost detection:
   - Patterns checked: localhost, 127.0.0.1, 0.0.0.0, 192.168.x, 10.x
   - Error display: bg-red-50 with red border
   - Message: "Cannot deploy with local endpoint"
   - Suggestion: "Please provide a public URL"

#### 4.6 Action Buttons
1. **Inspect** button row:
   - Layout: flex justify-end space-x-3
   - Position: bottom of modal
   - Padding: pt-6 border-t
2. **Check** Cancel button:
   - Style: secondary/outline
   - Text: text-gray-700 dark:text-gray-300
   - Border: border-gray-300
   - Hover: bg-gray-50
3. **Verify** Deploy button:
   - Background: #EA2831
   - Text: white font-medium
   - Loading state: spinner + "Deploying..."
   - Success: green flash before close
   - Error: shake animation + red background
   - Disabled: when validation fails

### Expected Visual Results
- Clear visual hierarchy in modal
- Proper use of Workbench colors
- Smooth transitions between states
- Clear error and warning displays
- Intuitive scope selection interface

---

## SCENARIO 5: Deployment State Transitions and Visual Feedback

### User Story
As a user, I want clear visual feedback during and after deployment.

### Detailed Test Steps

#### 5.1 Deployment Process Animation
1. **Click** Deploy button in modal
2. **Observe** loading sequence:
   - Button spinner: rotate animation
   - Progress indicator: optional progress bar
   - Modal content: slight opacity reduction
   - Estimated time: displayed if > 3 seconds
3. **Check** success animation:
   - Checkmark icon: scale + fade in
   - Success message: slide down
   - Auto-close: after 1.5 seconds
   - Background flash: subtle green

#### 5.2 Agent Card Status Update
1. **Verify** card changes post-deployment:
   - Status badge: DEVELOPMENT → DEPLOYED_TEAM/ALL
   - Badge color: gray → green/blue
   - Badge animation: pulse 3 times
   - Deploy button: "Deploy" → "Undeploy"
   - Button color: #EA2831 → gray-600
2. **Check** card visual indicators:
   - Deployed indicator: small dot or icon
   - Tooltip: "Deployed on [date] by [user]"
   - Border accent: subtle color change

#### 5.3 Workbench Chat Disabled State
1. **Click** deployed agent card
2. **Verify** chat disabled display:
   - Overlay: semi-transparent with blur
   - Icon: Globe icon (h-20 w-20)
   - Icon container: rounded-full bg-gray-100
   - Message title: "Agent is Deployed" (text-lg font-semibold)
   - Message body: explains deployment status
   - Text alignment: centered
   - Call-to-action: "Undeploy to enable chat"
3. **Check** visual consistency:
   - Maintains layout structure
   - Config panel: also shows disabled state
   - Smooth transition from active to disabled

#### 5.4 Trace Panel Disabled State
1. **Inspect** trace panel when deployed:
   - Background: slightly dimmed
   - Message: "Trace collection disabled for deployed agents"
   - Icon: Info icon with tooltip
   - Visual style: consistent with chat disabled
2. **Test** trace endpoint behavior:
   - No new events appear
   - Historical traces: optionally viewable
   - Clear indication of disabled state

### Expected Visual Results
- Smooth state transitions
- Clear disabled states
- Consistent visual language
- Appropriate use of animation
- No jarring visual changes

---

## SCENARIO 6: Hub Interface and Deployed Agent Display

### User Story
As a platform user, I want to easily find and use deployed agents in the Hub.

### Detailed Test Steps

#### 6.1 Hub Navigation and Theme Switch
1. **Navigate** to Hub via sidebar
2. **Verify** theme transition:
   - Sidebar active state: changes to Hub blue (#359EFF)
   - Background: transitions to Hub colors
   - Smooth color animation: 300ms
3. **Check** Hub header:
   - Title: "Agent Hub" or similar
   - Primary color: #359EFF throughout
   - Background: #f5f7f8 (light) or #0f1923 (dark)

#### 6.2 Deployed Agent Cards in Hub
1. **Locate** deployed agents section
2. **Verify** card design differences from Workbench:
   - Border color: blue accent instead of gray
   - Status badge: production-ready indicators
   - Action buttons: "Chat" instead of "Deploy"
   - No edit/delete options for non-owners
3. **Check** card information:
   - Deploy badge: "PUBLIC" or "TEAM"
   - User count: "Used by X users"
   - Last active: timestamp
   - Rating: if implemented

#### 6.3 Hub-Specific Visual Elements
1. **Inspect** search bar:
   - Position: prominent, top of page
   - Style: larger than Workbench search
   - Placeholder: "Search deployed agents..."
   - Filters: dropdown or chips for scope
2. **Check** category filters:
   - Pills/chips design
   - Active state: bg-hub-primary text-white
   - Inactive: bg-gray-100 hover effect
3. **Verify** sorting options:
   - Dropdown: clean, modern style
   - Options: Popular, Recent, Name
   - Icons: appropriate for each option

#### 6.4 Hub Chat Interface
1. **Click** "Chat" on deployed agent
2. **Verify** chat modal/page:
   - Hub blue accents instead of red
   - Session management UI visible
   - No configuration panel (hidden)
   - Clean, user-friendly interface
3. **Check** session sidebar:
   - List of past sessions
   - New session button
   - Session names: editable
   - Delete option: with confirmation

### Expected Visual Results
- Clear visual distinction from Workbench
- Hub blue (#359EFF) theming
- Production-ready appearance
- Simplified user interface
- Professional, polished design

---

## SCENARIO 7: Dark Mode Consistency Across Deploy Flow

### User Story
As a user who prefers dark mode, I want consistent theming throughout the deployment process.

### Detailed Test Steps

#### 7.1 Dark Mode Toggle Verification
1. **Enable** dark mode via settings
2. **Verify** immediate changes:
   - Background: transitions smoothly
   - Text: inverts appropriately
   - No flash of unstyled content
   - Persists across page refreshes

#### 7.2 Workbench Dark Mode
1. **Check** agent grid:
   - Background: #211111 (Workbench dark)
   - Cards: bg-gray-800 with light borders
   - Text: appropriate contrast ratios
   - Shadows: adjusted for dark mode
2. **Verify** modals:
   - Background: bg-gray-800
   - Inputs: dark with light text
   - Borders: subtle, not too bright

#### 7.3 Deploy Modal Dark Mode
1. **Open** deploy modal
2. **Check** dark mode styling:
   - Modal background: bg-gray-800
   - Radio options: dark with hover states
   - Icons: appropriate brightness
   - Text contrast: WCAG AA compliant
3. **Verify** warnings/errors:
   - Maintain visibility in dark mode
   - Use appropriate color variants
   - Icons remain distinguishable

#### 7.4 Hub Dark Mode
1. **Navigate** to Hub
2. **Verify** dark theme:
   - Background: #0f1923 (Hub dark)
   - Cards: appropriate dark variants
   - Blue accents: adjusted for dark
   - Text: sufficient contrast

### Expected Visual Results
- Seamless dark mode experience
- Consistent theming across all components
- Proper contrast ratios maintained
- No broken or unstyled elements
- Smooth transitions when toggling

---

## SCENARIO 8: Responsive Design and Mobile Experience

### User Story
As a mobile user, I want to be able to deploy and manage agents from my device.

### Detailed Test Steps

#### 8.1 Mobile Viewport (360px - 768px)
1. **Resize** browser to 360px width
2. **Check** Workbench layout:
   - Grid: single column
   - Cards: full width minus padding
   - Text: readable size (min 14px)
   - Buttons: touch-friendly (min 44px)
3. **Verify** navigation:
   - Hamburger menu: visible and functional
   - Sidebar: slides from left
   - Overlay: darkens background

#### 8.2 Tablet Viewport (768px - 1024px)
1. **Resize** to tablet width
2. **Check** layout adjustments:
   - Grid: 2 columns
   - Sidebar: collapsible or mini
   - Modals: appropriate sizing
   - Chat/trace: stacked layout

#### 8.3 Touch Interactions
1. **Test** on actual device or emulator
2. **Verify** touch targets:
   - Minimum size: 44x44px
   - Spacing: prevents accidental taps
   - Hover states: removed on touch
   - Long press: context menus if applicable
3. **Check** gestures:
   - Swipe: for sidebar/panels
   - Pinch: zoom disabled where appropriate
   - Scroll: smooth and responsive

#### 8.4 Deploy Modal Mobile
1. **Open** deploy modal on mobile
2. **Verify** mobile optimizations:
   - Full-screen or near full-screen
   - Scrollable content
   - Fixed header/footer
   - Large touch targets
   - Keyboard avoiding for inputs

### Expected Visual Results
- Fully responsive layouts
- Touch-optimized interfaces
- Readable text at all sizes
- No horizontal scrolling
- Smooth transitions on resize

---

## SCENARIO 9: Performance and Animation Quality

### User Story
As a user, I want smooth, performant animations that enhance rather than hinder the experience.

### Detailed Test Steps

#### 9.1 Animation Performance
1. **Monitor** all animations:
   - Target: 60fps throughout
   - No jank or stuttering
   - GPU acceleration where appropriate
2. **Test** specific animations:
   - Modal open/close: < 300ms
   - Card hover: immediate response
   - Button clicks: < 100ms feedback
   - Page transitions: < 500ms

#### 9.2 Loading States
1. **Throttle** network to 3G
2. **Check** loading indicators:
   - Skeleton screens: for content
   - Spinners: for actions
   - Progress bars: for long operations
   - Appropriate messaging
3. **Verify** perceived performance:
   - Optimistic updates where safe
   - Progressive enhancement
   - Lazy loading for images/content

#### 9.3 Error State Handling
1. **Force** various error conditions
2. **Check** error displays:
   - Clear error messages
   - Visual distinction (red/warning colors)
   - Recovery options provided
   - Animation: shake or pulse for attention
3. **Verify** error recovery:
   - Retry mechanisms
   - Graceful degradation
   - State preservation

### Expected Visual Results
- Smooth 60fps animations
- Appropriate loading feedback
- Clear error communication
- No performance degradation
- Responsive to user input

---

## SCENARIO 10: Accessibility and Keyboard Navigation

### User Story
As a user with accessibility needs, I want to fully navigate and use the deploy feature.

### Detailed Test Steps

#### 10.1 Keyboard Navigation
1. **Tab** through entire interface
2. **Verify** tab order:
   - Logical flow
   - Skip links available
   - Focus indicators visible
   - No keyboard traps
3. **Test** keyboard shortcuts:
   - ESC: closes modals
   - Enter: submits forms
   - Space: toggles checkboxes/radios
   - Arrow keys: navigate options

#### 10.2 Screen Reader Compatibility
1. **Enable** screen reader (NVDA/JAWS)
2. **Verify** announcements:
   - Page changes announced
   - Form labels read correctly
   - Error messages announced
   - Status updates communicated
3. **Check** ARIA attributes:
   - Roles properly defined
   - Labels for all controls
   - Live regions for updates
   - Descriptions where needed

#### 10.3 Color Contrast
1. **Use** contrast checker tool
2. **Verify** WCAG compliance:
   - Normal text: 4.5:1 minimum
   - Large text: 3:1 minimum
   - UI components: 3:1 minimum
   - Focus indicators: visible
3. **Check** color-blind modes:
   - Information not only by color
   - Patterns/icons supplement color
   - Clear distinction maintained

#### 10.4 Focus Management
1. **Test** focus behavior:
   - Modal open: focus trapped inside
   - Modal close: returns to trigger
   - Error: focus to error message
   - Success: appropriate next focus
2. **Verify** focus indicators:
   - Visible outline or ring
   - Consistent styling
   - High contrast
   - Not removed by CSS

### Expected Visual Results
- Full keyboard accessibility
- Clear focus indicators
- WCAG AA compliance
- Screen reader friendly
- Inclusive design patterns

---

## SCENARIO 11: Typography and Content Hierarchy

### User Story
As a reader, I want clear, readable text with proper hierarchy throughout the deploy feature.

### Detailed Test Steps

#### 11.1 Font Consistency
1. **Verify** font families:
   - Primary: system font stack
   - Monospace: for code/endpoints
   - Consistent throughout app
2. **Check** font sizes:
   - Headers: clear hierarchy (4xl → xs)
   - Body text: minimum 14px
   - Labels: minimum 12px
   - Consistent scale system

#### 11.2 Text Hierarchy
1. **Inspect** headings:
   - H1: Page titles (text-4xl font-black)
   - H2: Section headers (text-2xl font-bold)
   - H3: Subsections (text-xl font-semibold)
   - Proper nesting, no skips
2. **Check** content structure:
   - Clear visual hierarchy
   - Appropriate white space
   - Consistent line heights
   - Readable line lengths (45-75 chars)

#### 11.3 Readability
1. **Test** reading experience:
   - Sufficient paragraph spacing
   - Clear link styling
   - Emphasis where needed
   - No walls of text
2. **Verify** contrast:
   - Text on backgrounds
   - Text on colored sections
   - Disabled state text
   - Placeholder text

### Expected Visual Results
- Clear typographic hierarchy
- Consistent font usage
- Readable at all sizes
- Proper spacing and rhythm
- Professional appearance

---

## SCENARIO 12: Icon Usage and Visual Consistency

### User Story
As a user, I want consistent, meaningful icons that enhance understanding.

### Detailed Test Steps

#### 12.1 Icon Inventory
1. **Document** all icons used:
   - Deploy: Rocket
   - Team: Users
   - Public: Globe
   - Warning: AlertCircle
   - Success: CheckCircle
   - Error: XCircle
   - Info: Info
2. **Verify** icon consistency:
   - Same icon library (Lucide/Heroicons)
   - Consistent sizing (h-4 w-4, h-5 w-5)
   - Consistent stroke width
   - Appropriate colors

#### 12.2 Icon Context
1. **Check** icon usage:
   - Always with text labels
   - Meaningful without color
   - Appropriate to action
   - Cultural considerations
2. **Verify** icon states:
   - Hover: slight scale or color
   - Active: pressed appearance
   - Disabled: reduced opacity

### Expected Visual Results
- Consistent icon system
- Meaningful icon choices
- Proper sizing and alignment
- Accessible implementations
- Visual harmony maintained

---

## Design Validation Checklist

### Color Harmony
- [ ] Workbench red (#EA2831) used consistently
- [ ] Hub blue (#359EFF) properly applied
- [ ] Color transitions smooth between modes
- [ ] Dark mode colors properly adjusted
- [ ] Sufficient contrast ratios throughout
- [ ] Warning/error colors distinct and accessible

### Layout Consistency
- [ ] Grid system properly applied
- [ ] Spacing consistent (using 4px base)
- [ ] Alignment proper across components
- [ ] Responsive breakpoints smooth
- [ ] No layout shifts during interactions
- [ ] Proper use of white space

### Typography
- [ ] Font hierarchy clear and consistent
- [ ] Readable at all sizes
- [ ] Line heights appropriate
- [ ] Text truncation handled properly
- [ ] Font weights used meaningfully

### Animations
- [ ] All animations smooth (60fps)
- [ ] Durations appropriate (200-300ms)
- [ ] Easing functions consistent
- [ ] No excessive or distracting motion
- [ ] Respect prefers-reduced-motion

### Component Consistency
- [ ] Buttons follow design system
- [ ] Form inputs consistent styling
- [ ] Cards maintain same structure
- [ ] Modals use same patterns
- [ ] Navigation elements uniform

### Visual Feedback
- [ ] Hover states on all interactive elements
- [ ] Focus states clearly visible
- [ ] Active states provide feedback
- [ ] Loading states informative
- [ ] Success/error states clear

### Accessibility
- [ ] WCAG AA contrast compliance
- [ ] Keyboard navigation complete
- [ ] Screen reader compatible
- [ ] Focus management proper
- [ ] Error messages helpful

### Performance
- [ ] Images optimized and lazy loaded
- [ ] Animations use CSS/GPU
- [ ] No layout thrashing
- [ ] Smooth scrolling
- [ ] Fast initial paint

---

## Platform-Specific Testing

### Browser Testing Matrix
| Browser | Version | Desktop | Mobile | Dark Mode | Notes |
|---------|---------|---------|---------|-----------|-------|
| Chrome | Latest | ✓ | ✓ | ✓ | Primary |
| Firefox | Latest | ✓ | ✓ | ✓ | Check custom scrollbars |
| Safari | 15+ | ✓ | ✓ | ✓ | Check backdrop filters |
| Edge | Latest | ✓ | ✓ | ✓ | Chromium-based |
| Samsung Internet | Latest | - | ✓ | ✓ | Android default |

### Device Testing
| Device Type | Screen Size | Orientation | Touch | Notes |
|-------------|-------------|-------------|-------|-------|
| iPhone 14 Pro | 390x844 | Both | ✓ | Notch handling |
| iPhone SE | 375x667 | Both | ✓ | Small screen |
| iPad Pro | 1024x1366 | Both | ✓ | Large tablet |
| Pixel 6 | 412x915 | Both | ✓ | Android |
| Desktop HD | 1920x1080 | Landscape | - | Standard |
| Desktop 4K | 3840x2160 | Landscape | - | High DPI |

---

## Success Metrics

### Visual Quality
- Professional, modern appearance
- Consistent design language
- Clear information architecture
- Appropriate use of color and space
- Smooth interactions and transitions

### Usability
- Intuitive deployment flow
- Clear status communication
- Error prevention and recovery
- Efficient task completion
- Satisfying user experience

### Performance
- Page load < 3 seconds
- Interaction response < 100ms
- Animation at 60fps
- No memory leaks
- Smooth scrolling

### Accessibility
- WCAG AA compliant
- Full keyboard navigation
- Screen reader support
- Clear focus indicators
- Inclusive design

### Cross-Platform
- Consistent across browsers
- Responsive on all devices
- Touch-optimized on mobile
- Progressive enhancement
- Graceful degradation

---

## Automated Testing Recommendations

### Visual Regression Testing
```javascript
// Using Playwright for visual testing
await page.screenshot({
  path: 'deploy-modal-light.png',
  fullPage: true
});

// Compare with baseline
expect(await page.screenshot()).toMatchSnapshot('deploy-modal.png', {
  maxDiffPixels: 100
});
```

### Color Validation
```javascript
// Check specific color values
const deployButton = await page.locator('[data-testid="deploy-button"]');
const bgColor = await deployButton.evaluate(el =>
  window.getComputedStyle(el).backgroundColor
);
expect(bgColor).toBe('rgb(234, 40, 49)'); // #EA2831
```

### Animation Performance
```javascript
// Monitor animation frames
await page.evaluate(() => {
  let frames = 0;
  const start = performance.now();

  function countFrames() {
    frames++;
    if (performance.now() - start < 1000) {
      requestAnimationFrame(countFrames);
    } else {
      console.log(`FPS: ${frames}`);
      expect(frames).toBeGreaterThan(55); // Target 60fps
    }
  }

  requestAnimationFrame(countFrames);
});
```

### Accessibility Audit
```javascript
// Using Playwright with axe-core
const violations = await page.evaluate(async () => {
  const results = await axe.run();
  return results.violations;
});

expect(violations).toHaveLength(0);
```

---

## Issue Tracking Template

### Bug Report Format
```markdown
**Issue Type**: Visual/Functional/Performance
**Severity**: Critical/High/Medium/Low
**Component**: [Component name]
**Browser/Device**: [Details]
**Dark Mode**: Yes/No

**Description**:
[Clear description of the issue]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result**:
[What should happen]

**Actual Result**:
[What actually happens]

**Screenshots**:
[Attach relevant screenshots]

**Additional Context**:
[Any other relevant information]
```

---

## Final Validation Sign-off

### Pre-Deployment Checklist
- [ ] All test scenarios passed
- [ ] Design consistency verified
- [ ] Colors match brand guidelines
- [ ] Dark mode fully functional
- [ ] Responsive on all devices
- [ ] Accessibility standards met
- [ ] Performance benchmarks achieved
- [ ] Cross-browser testing complete
- [ ] Error handling comprehensive
- [ ] Documentation updated

### Stakeholder Approval
- [ ] Design team approval
- [ ] Development team approval
- [ ] QA team approval
- [ ] Product owner approval
- [ ] Accessibility audit passed

---

## Maintenance and Future Considerations

### Regular Testing Cadence
- Daily: Smoke tests on critical paths
- Weekly: Full regression suite
- Monthly: Performance benchmarks
- Quarterly: Accessibility audit

### Design System Updates
- Document any color changes
- Update component library
- Maintain design tokens
- Version control assets
- Communicate changes

### Continuous Improvement
- Monitor user feedback
- Track usage analytics
- A/B test variations
- Iterate on pain points
- Enhance user experience

---

This comprehensive test scenario document ensures thorough validation of the Deploy feature from both functional and design perspectives, maintaining the high quality standards of the A2A Agent Platform.