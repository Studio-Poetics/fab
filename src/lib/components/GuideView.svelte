<script lang="ts">
  let { onclose, module: startModule = 'box' }:
    { onclose: () => void; module?: string } = $props();

  // selectedOverride = null  → follow the prop (so opening guide always shows current module)
  // selectedOverride = string → user navigated within the guide
  let selectedOverride = $state<string | null>(null);
  const active = $derived(selectedOverride ?? startModule);

  const MODULES = [
    { id: 'box',       label: 'BOX',        sub: 'Laser-cut boxes'      },
    { id: 'gears',     label: 'GEARS',      sub: 'Gear trains'          },
    { id: 'hinges',    label: 'HINGES',     sub: 'Flex hinges'          },
    { id: 'kinetic',   label: 'KINETIC',    sub: 'Mechanisms'           },
    { id: 'enclosures',label: 'ENCLOSURES', sub: 'Electronics boxes'    },
  ];

  interface Term  { term: string; badge?: string; body: string; }
  interface Step  { n: number; text: string; }
  interface Guide {
    title:    string;
    color:    string;
    tagline:  string;
    what:     string;
    analogy:  string;
    terms:    Term[];
    steps:    Step[];
    tips:     string[];
    trivia:   string[];
  }

  const GUIDES: Record<string, Guide> = {

    box: {
      title:   'BOX MODULE',
      color:   'var(--orange)',
      tagline: 'Design flat-pack boxes — the laser cutter does the folding for you.',
      what: `You draw the inside dimensions of a box. The app figures out all six flat panels, adds the interlocking edge tabs, and gives you a file your laser cutter can cut from plywood, acrylic, or cardboard. Fold them up and you have a box.`,
      analogy: `Think of it like unfolding a cereal box — you're designing the flat net that, when cut and folded, becomes a 3D box. Except the laser does the cutting and the tabs do the folding, so there's almost no assembly.`,
      terms: [
        {
          term: 'Width / Height / Depth',
          body: 'The inside measurements of your finished box — like measuring the inside of a drawer. Width = left to right. Height = bottom to top. Depth = front to back. Always measure the INSIDE space, not the outside.',
        },
        {
          term: 'Material Thickness (t)',
          body: 'How thick your sheet is. Common values: 3 mm plywood (~1/8 inch), 6 mm MDF (~1/4 inch), 3 mm acrylic. Always measure with calipers — a sheet sold as "3 mm" is often 2.7 mm or 3.2 mm. Being even 0.3 mm off makes joints too loose or impossible to push together.',
        },
        {
          term: 'Kerf',
          badge: 'tricky concept',
          body: 'The laser vaporises a thin sliver of material as it cuts — like a saw blade removing sawdust. That gap is the kerf (Old English for "the cut"). Typically 0.05–0.3 mm. If joints are wobbly, increase kerf. If they won\'t push together, decrease it. Cut a test joint first.',
        },
        {
          term: 'Finger Joints',
          body: 'The interlocking tabs and slots on the box edges — named for how fingers interlock when you clasp your hands. No glue needed for a snug fit; the tabs hold everything square. Add a dab of wood glue to make it permanent.',
        },
        {
          term: 'Open Tray',
          badge: 'box type',
          body: 'A box with no lid — four walls and a bottom. Good for organisers, drawer inserts, serving trays, shadow boxes.',
        },
        {
          term: 'Closed Box',
          badge: 'box type',
          body: 'Six sides, fully enclosed. Classic storage box, shipping container, project housing.',
        },
        {
          term: 'Hinged Lid',
          badge: 'box type',
          body: 'A lid attached along the back edge with a laser-cut living hinge strip. Opens like a jewelry box or treasure chest. The hinge is cut into the material itself.',
        },
        {
          term: 'Slider Lid',
          badge: 'box type',
          body: 'A lid that slides in from the top — like a matchbox or Japanese puzzle box. Very satisfying to open. The grooves that guide the lid are cut into the side panels.',
        },
        {
          term: 'Lift-Off Lid',
          badge: 'box type',
          body: 'A separate lid-tray that sits on top, like a shoebox. The lid has short walls that locate it. Simple and elegant.',
        },
        {
          term: 'Multi-Section',
          badge: 'box type',
          body: 'A box divided into compartments by internal dividers. Good for storing screws, art supplies, game pieces, chocolates. Set the number of X and Y dividers independently.',
        },
        {
          term: 'Finger Count',
          body: 'How many finger tabs per edge. More fingers = stronger joint but harder to assemble. Fewer fingers = easier assembly but less glue surface. 5 fingers is a good starting point.',
        },
      ],
      steps: [
        { n: 1, text: 'Pick "Closed Box" from the box type grid on the left.' },
        { n: 2, text: 'Set Width × Height × Depth to something you can actually cut — 100 × 50 × 80 mm is a solid first box.' },
        { n: 3, text: 'Measure your material with calipers and set Thickness. Don\'t guess.' },
        { n: 4, text: 'Leave Kerf at 0.1 mm for now. You\'ll adjust after a test cut.' },
        { n: 5, text: 'Toggle Finger Joints ON. Watch the panels update in the preview.' },
        { n: 6, text: 'Click EXPORT SVG. Open the file in Inkscape, LightBurn, or your laser software.' },
        { n: 7, text: 'Cut a single joint corner first. Push-fit should be snug but hand-pressable. Adjust kerf up (loose) or down (too tight) and re-export.' },
      ],
      tips: [
        'Always cut one test joint before your full box. A 30 × 30 mm offcut takes 10 seconds to cut and saves your whole sheet.',
        '3 mm plywood is the most forgiving beginner material — cheap, cuts cleanly, glues well. Start there.',
        'For acrylic, the cut edges melt slightly. Add 0.05 mm extra kerf and sand edges with 220 grit sandpaper.',
        'If your box will hold anything heavy, glue the finger joints with wood glue or super glue. Dry-fit is beautiful but not structural.',
        'The 3D assembled view in the toolbar lets you see the box before you cut a single piece.',
      ],
      trivia: [
        'Finger joints have been used in furniture for over 2,000 years. Ancient Egyptian wooden boxes from 1350 BC used a form of finger joinery.',
        'A laser cutter\'s beam is thinner than a human hair — about 0.1 mm in diameter — which is why the kerf is so small.',
        'The word "kerf" is Old English, first recorded in 1250 AD, meaning "a notch or cut."',
        'The earliest flat-pack furniture idea is credited to IKEA\'s founder Ingvar Kamprad, who shipped a table with its legs removed in 1956. Laser-cut flat-pack takes this further — the entire structure ships flat.',
      ],
    },

    gears: {
      title:   'GEARS MODULE',
      color:   '#6B48FF',
      tagline: 'Design tooth-and-wheel gear sets that transfer rotation, change speed, and multiply force.',
      what: `Gears are toothed wheels that mesh together. When one turns, it drives the other. You can slow things down (and multiply torque — turning force), speed things up, or reverse direction. This module generates the precise tooth profile needed for gears that actually run smoothly.`,
      analogy: `Imagine two bicycle sprockets side by side, teeth touching. Turn the small one fast, the big one turns slow but powerfully. That\'s a gear reduction. Two meshing gears are doing the same thing, just touching directly instead of through a chain.`,
      terms: [
        {
          term: 'Module (m)',
          badge: 'most important',
          body: 'The "scale" of the teeth — like a font size for gear teeth. Module 1 = tiny delicate teeth (watch mechanisms, small instruments). Module 2 = medium, good for laser-cut projects. Module 4 = chunky robust teeth. Both gears in a pair MUST have the same module or they won\'t mesh.',
        },
        {
          term: 'Teeth (Z or N)',
          body: 'How many teeth around the gear. More teeth = bigger gear (for the same module). The RATIO between two gears\' tooth counts determines speed change. Z₁=20 and Z₂=40 → the big gear turns at half speed with double the torque.',
        },
        {
          term: 'Gear Ratio',
          badge: 'key concept',
          body: 'Output speed ÷ input speed. Ratio = Z₂ ÷ Z₁. A 3:1 ratio means the output turns 3× slower but with 3× the turning force. Car first gear is about 3.5:1 — strong but slow. Fifth gear is close to 1:1 — fast but weak.',
        },
        {
          term: 'Pitch Diameter (PD)',
          body: 'The imaginary rolling circle where teeth effectively mesh. PD = module × teeth. Two gears\' pitch circles must be tangent for correct operation. Centre distance = (PD₁ + PD₂) ÷ 2. This is the number you use when drilling holes in your project.',
        },
        {
          term: 'Pressure Angle',
          body: 'The angle at which teeth push against each other. 20° is the world standard for almost everything — use it. 14.5° is an old standard from the early 1900s. 25° is for very heavy industrial loads. If you\'re unsure: 20°.',
        },
        {
          term: 'Involute Profile',
          badge: 'the clever bit',
          body: 'The specific mathematical curve shape of each tooth. Discovered in 1674 by Ole Rømer, it ensures teeth always push at the same angle regardless of where they are in contact — making gears run smoothly instead of lurching. Without it, gears would vibrate and wear out quickly.',
        },
        {
          term: 'Clearance Hole / Bore',
          body: 'The hole in the centre for your axle or shaft. Match it to your shaft diameter: M3 bore for a 3 mm rod, M5 for a 5 mm rod. Add 0.1–0.2 mm tolerance for a slip fit.',
        },
        {
          term: 'Centre Distance',
          body: 'How far apart to place the two gear axles. = (PD₁ + PD₂) ÷ 2. This is critical — wrong centre distance and gears won\'t mesh (too far) or will bind (too close). The app shows this value in the right panel.',
        },
        {
          term: 'Rack & Pinion',
          badge: 'gear mode',
          body: 'A round gear (pinion) meshes with a flat toothed bar (rack). Converts rotary motion into straight-line motion. Your car\'s steering uses this. Also used in CNC machine axes, camera sliders, lab equipment.',
        },
        {
          term: 'Planetary Gearset',
          badge: 'gear mode',
          body: 'Three sets of gears in concentric circles: a sun gear in the centre, planet gears that orbit it, and a ring gear on the outside. Very compact for the gear ratio they produce. Used in automatic transmissions, power drills, and helicopter rotors.',
        },
        {
          term: 'Diametral Pitch (DP)',
          body: 'An older American standard for tooth size — teeth per inch of pitch diameter. DP = 25.4 ÷ module. If you need to match gears from a US supplier, use this to find the equivalent module. The app shows it in the right panel.',
        },
      ],
      steps: [
        { n: 1, text: 'Select "SPUR" mode for a simple two-gear set.' },
        { n: 2, text: 'Set Module = 2 (good for laser cutting), Z₁ = 20, Z₂ = 40 for a 2:1 reduction.' },
        { n: 3, text: 'Note the Centre Distance shown in the right panel — that\'s how far apart to drill your axle holes.' },
        { n: 4, text: 'Set bore holes to match your shaft diameter (add 0.1 mm tolerance).' },
        { n: 5, text: 'Export SVG. Cut from 6 mm acrylic or 6 mm MDF. Acrylic runs smoother.' },
        { n: 6, text: 'Rub the teeth with candle wax (paraffin) as lubricant — works surprisingly well on laser-cut gears.' },
      ],
      tips: [
        'Both gears in a pair must have the same Module. Mix modules and they won\'t mesh, ever.',
        'Minimum ~12 teeth. Below that, the tooth roots become so narrow the teeth can interfere with each other and jam.',
        'For decorative non-functional gears (wall art, costume props), use Module 4–6 with 8–12 teeth for a chunky, industrial look.',
        'Acrylic gears run quieter and smoother than wood gears. For moving mechanisms, cut from 5 or 6 mm acrylic.',
        'The 3D Print view generates a proper 3D gear you can export for FDM 3D printing — great for mechanisms needing more teeth depth.',
      ],
      trivia: [
        'The oldest known working gear mechanism is the Antikythera machine, found in a Greek shipwreck and dated ~87 BC. It had at least 37 bronze gears and predicted astronomical events.',
        'The word "gear" comes from Old Norse "gervi," meaning "apparel" or "equipment."',
        'Involute gear geometry was mathematically described by Leonhard Euler in 1754. He proved it was the only tooth shape ensuring constant velocity ratio.',
        'A car\'s differential gear (the thing that lets your wheels turn at different speeds on corners) was invented by Onésiphore Pecqueur in 1827.',
        'The International Space Station uses gears made of dry-lubricant material because oil-based lubricants evaporate in the vacuum of space.',
      ],
    },

    hinges: {
      title:   'HINGES MODULE',
      color:   'var(--green)',
      tagline: 'Cut flex patterns into flat sheets so rigid materials can bend like leather.',
      what: `A living hinge is a pattern of laser cuts that lets a normally rigid material — wood, acrylic, cardboard — bend and flex along a defined zone. No separate hinge hardware needed. The cuts are tiny, the bridges between them flex, and the whole zone moves like a joint. This module designs those cut patterns and tells you how far they\'ll actually bend.`,
      analogy: `Think of the fold lines on a cereal box — scored lines that make a rigid cardboard sheet fold cleanly. Now imagine hundreds of tiny cuts instead of one score line, distributed so the bend is smooth and won\'t crack. That\'s a living hinge. Or: bend a stack of A4 paper. Each sheet is rigid, but the stack bends. The cuts work the same way.`,
      terms: [
        {
          term: 'Flex Zone',
          body: 'The rectangular area that will actually bend. Everything outside it stays rigid. You set its width and height. Make it taller for more bend angle; make it wider to span a wider joint.',
        },
        {
          term: 'Row Spacing',
          badge: 'most important',
          body: 'How far apart each row of cuts is. Less spacing = more flexible but weaker. More spacing = stiffer but stronger. Rule of thumb: row spacing should equal at least your material thickness. Going below 0.8× thickness risks stress cracking between cuts.',
        },
        {
          term: 'Bridge',
          body: 'The tiny uncut sections between the ends of each cut — like rungs of a ladder. They\'re the only thing holding the material together. Too short and they tear under load; too long and the hinge gets stiff. A bridge of 0.75× your material thickness is the minimum safe value.',
        },
        {
          term: 'Minimum Bend Radius',
          badge: 'physics',
          body: 'The tightest curve you can bend without cracking the material. Calculated from your row spacing and material thickness. If the app says R_min = 20 mm, don\'t try to bend it around anything narrower than a 20 mm radius (a ~40 mm diameter pipe).',
        },
        {
          term: 'Max Flex Angle',
          badge: 'physics',
          body: 'How far the hinge can fold, based on your zone height and minimum bend radius. 90° means it can fold like a book cover. The app calculates this live — if it\'s below 70°, increase the zone height or decrease row spacing.',
        },
        {
          term: 'Kerf Pattern',
          badge: 'pattern',
          body: 'Simple parallel straight cuts. The strongest and most predictable pattern. Best for beginners and structural applications. Cuts look like a grid of dashes.',
        },
        {
          term: 'Wave Pattern',
          badge: 'pattern',
          body: 'Wavy cuts instead of straight lines. Bends more evenly across the width, distributing stress better. Looks organic and beautiful — popular for product design and furniture. Slightly more flexible than kerf.',
        },
        {
          term: 'Cross Pattern',
          badge: 'pattern',
          body: 'A grid of cuts in both directions. Can flex in two axes at once — like a wrist joint or a flexible panel. Best for compound curves (wrapping around a curved surface). Weakest of the three patterns.',
        },
        {
          term: 'Row / t Ratio',
          body: 'Row spacing divided by material thickness. The app shows this and warns when it drops below 0.8 — below that, the material between cuts becomes so thin it can crack instead of flex.',
        },
      ],
      steps: [
        { n: 1, text: 'Set Width = 80 mm, Height = 40 mm. This is your test flex zone.' },
        { n: 2, text: 'Set Material Thickness to match your sheet (measure it!).' },
        { n: 3, text: 'Choose "KERF" pattern to start — most predictable.' },
        { n: 4, text: 'Check the Max Flex Angle in the left panel. Aim for ≥ 90°. Increase Height if needed.' },
        { n: 5, text: 'Export SVG and cut a 80 × 80 mm test strip with the hinge in the middle.' },
        { n: 6, text: 'Bend the test strip. If it cracks: increase Row Spacing. If it\'s too stiff: decrease Row Spacing.' },
        { n: 7, text: 'Once happy, incorporate the flex zone into your full design.' },
      ],
      tips: [
        'Cut perpendicular to wood grain for best flex. Parallel to grain = likely to crack along the grain instead of flexing.',
        'Always cut a test strip first. A 30 × 60 mm test takes seconds and tells you everything.',
        'Rub the cut zone with candle wax or beeswax — reduces friction and massively improves flex life.',
        '3 mm plywood bends well. 3 mm acrylic is tricky — use the WAVE pattern and go slowly with the laser.',
        'For box lids and curved panels, the hinge zone should be at least 1.5× the material thickness in height per degree of bend.',
        'Cardboard and thin card stock make excellent living hinges — great for prototyping ideas cheaply.',
      ],
      trivia: [
        'The shampoo bottle cap that flips open is an injection-moulded living hinge — made from polypropylene, which can flex over 500 million times without breaking.',
        '"Living hinge" as a term for laser-cut patterns became popular around 2010 when desktop laser cutters became affordable for hobbyists.',
        'Polypropylene is so good at living hinges that bottle caps use the thinnest possible section — about 0.25 mm — for maximum flexibility.',
        'Ancient Japanese paper-folding (origami) uses the same principle: scored folds concentrate bending stress at a controlled point.',
        'NASA uses living hinge mechanisms in spacecraft solar panels — they need to fold for launch and unfold in orbit without motors.',
      ],
    },

    kinetic: {
      title:   'KINETIC MODULE',
      color:   '#B45309',
      tagline: 'Design mechanical linkages that convert rotation into motion — the heart of every machine.',
      what: `Mechanisms are linked parts that transform one type of movement into another. The crank-slider turns continuous rotation (from a motor) into back-and-forth linear motion. The Scotch yoke does the same with a mathematically perfect smooth output. Cut the flat parts, pin them with bolts, add a motor or hand crank, and you have a working machine.`,
      analogy: `The same mechanism inside every car engine — pistons going up and down (linear) driving a crankshaft spinning in circles (rotational). Or your windshield wipers, a sewing machine needle, a bicycle pump. All crank-sliders. This module lets you design and cut your own.`,
      terms: [
        {
          term: 'Crank',
          body: 'A rotating arm attached to a motor or axle. As it spins, its far end traces a circle. That circular motion gets converted into back-and-forth motion by the connecting rod. Like bicycle pedals — your legs go in a circle, but the wheel goes forward.',
        },
        {
          term: 'Stroke Length',
          body: 'How far the output moves back and forth in one complete rotation. In a crank-slider, stroke = 2 × crank length. A 20 mm crank gives 40 mm total stroke.',
        },
        {
          term: 'Connecting Rod',
          badge: 'key part',
          body: 'The link between the spinning crank and the sliding output. Its length affects how smooth and even the motion is. A connecting rod that\'s at least 3× the crank length gives very smooth motion. Shorter rods create more uneven (but interesting) motion profiles.',
        },
        {
          term: 'Crank-Slider',
          badge: 'mechanism type',
          body: 'The classic engine mechanism: crank rotates → connecting rod transfers motion → slider moves in a straight line. Used in every piston engine, sewing machine, reciprocating saw, and bicycle pump ever made.',
        },
        {
          term: 'Scotch Yoke',
          badge: 'mechanism type',
          body: 'A refined version where a pin on the crank slides in a slot on the output — no connecting rod. The output follows a mathematically perfect sine wave (perfectly smooth and symmetrical). Used in precision pumps and some old steam engines. More compact than crank-slider.',
        },
        {
          term: 'Phase Angle',
          body: 'Where in the rotation cycle the mechanism starts. 0° = output is at one extreme end of its travel. 90° = output is at the midpoint, moving fastest. Useful when you want to synchronise multiple mechanisms — offset their phase angles.',
        },
        {
          term: 'Torque',
          body: 'Turning force — how hard a rotating shaft pushes. A mechanism with a long crank requires more torque from the motor but can move a heavier load. Short crank = less torque needed, but less force delivered.',
        },
        {
          term: 'Pivot / Pin Joint',
          body: 'The connection points between mechanism parts — usually a bolt, screw, or dowel that allows rotation. In laser-cut mechanisms, M3 bolts with washers and lock nuts are the standard pivot. Finger-tight + half turn is enough.',
        },
      ],
      steps: [
        { n: 1, text: 'Select "CRANK-SLIDER" — the simplest and most useful mechanism.' },
        { n: 2, text: 'Set Crank Length = 20 mm. This gives 40 mm total stroke.' },
        { n: 3, text: 'Set Rod Length = 60 mm (3× crank for smooth motion).' },
        { n: 4, text: 'Export SVG. Cut from 5 mm acrylic or 6 mm MDF.' },
        { n: 5, text: 'Use M3 × 20 mm bolts with a washer on each side as pivot pins. Add a nylon lock nut — snug but free to rotate.' },
        { n: 6, text: 'Mount on a frame with a hand crank or small DC motor (6V, ~30 RPM is satisfying to watch).' },
      ],
      tips: [
        'Connecting rod length should be ≥ 3× the crank length for smooth motion. Shorter is more interesting but harder on the mechanism.',
        'Put washers between every moving layer. Friction is the enemy of mechanisms.',
        'Sand the edges of all cut parts with 220-grit sandpaper. Smooth edges = less friction = better movement.',
        'Acrylic pivots on acrylic create surprisingly little friction. Add a tiny drop of sewing machine oil for something that will run for hours.',
        'Start with a hand crank rather than a motor — you can feel where it binds and fix it before adding a motor.',
      ],
      trivia: [
        'James Watt (the steam engine inventor) considered his parallel-motion linkage (1784) to be his greatest invention — more than the steam engine itself.',
        'The Scotch Yoke\'s name has nothing to do with Scotland. "Yoke" is Old English for "joining piece." No one is sure where "Scotch" came from — possibly a corruption of "notch."',
        'Archytas of Tarentum (~400 BC) built a mechanical steam-powered pigeon using linkage mechanisms — considered the first robot.',
        'A car\'s internal combustion engine uses four crank-slider mechanisms working together, 90° or 120° out of phase, so the rotation stays smooth.',
        'The mechanism that moves your windshield wipers has a specific name: the Pantograph-Peaucellier linkage. It converts the crank\'s circular motion into the wiper\'s sweeping arc.',
      ],
    },

    enclosures: {
      title:   'ENCLOSURES MODULE',
      color:   '#0284C7',
      tagline: 'Design precise project boxes for electronics — with pre-sized holes for every standard connector.',
      what: `An enclosure is the box that houses your electronics project. Unlike the Box module (which is for general storage), this module knows the exact dimensions of standard connectors — USB-C, HDMI, audio jacks, D-sub ports, mounting screws. Place them on any panel face, resize the box, and the holes stay correct. Export, laser cut, assemble.`,
      analogy: `Think of the plastic case around your Wi-Fi router or guitar pedal. It has specific holes for the power cable, ethernet port, buttons and LEDs — all in exactly the right size. This module lets you design the laser-cut equivalent, with the connector dimensions already memorised.`,
      terms: [
        {
          term: 'Panel',
          body: 'One flat face of the enclosure. FRONT = where you typically put controls and connectors. BACK = power input, data cables. TOP = ventilation slots or display window. BOTTOM = mounting feet. LEFT/RIGHT = additional ports or handles. Use the cross-shaped panel picker to switch between faces.',
        },
        {
          term: 'Cutout',
          body: 'A hole in a panel for a connector, button, switch, or display. The app knows the standard dimensions for common connectors — just select the type and it places the correct size hole.',
        },
        {
          term: 'USB-C',
          badge: 'connector',
          body: 'The oval connector on modern phones, laptops, and microcontrollers (like newer Raspberry Pi, Arduino Nano Every). Cutout is 9.0 × 3.2 mm with rounded corners. The rounded shape matters — a rectangular hole will let it rock and feel loose.',
        },
        {
          term: 'HDMI (Type A / Mini / Micro)',
          badge: 'connector',
          body: 'The trapezoidal video connector — wider at the top (latch side), narrower at the bottom. Type A (standard TV/monitor): 15 × 5.5 mm. Mini (cameras, tablets): 11.5 × 3.5 mm. Micro (phones, Raspberry Pi Zero): 7.5 × 3 mm.',
        },
        {
          term: 'D-Sub (DB-9, DB-15, DB-25)',
          badge: 'connector',
          body: 'The "D-shaped" serial and video connectors — trapezoid shell with chamfered top corners. DB-9 = old COM/serial port (still everywhere in industrial equipment). DB-15 = old VGA monitor connector. DB-25 = old printer port (LPT). The "D" refers to the shape of the metal shell.',
        },
        {
          term: 'XLR',
          badge: 'connector',
          body: '24 mm circular connector for professional microphones, stage lighting, and balanced audio. If you\'re building a studio preamp, audio interface, or stage effects unit, this is your main input. Named: X = Cannon X series, L = locking, R = rubber contact ring.',
        },
        {
          term: '6.35 mm Jack',
          badge: 'connector',
          body: 'The "quarter inch" audio jack (6.35 mm diameter) used for guitars, headphones in studios, keyboard amplifiers, and instrument cables. Needs a 6.35 mm hole for the barrel to pass through.',
        },
        {
          term: '6 mm Pot (Potentiometer)',
          badge: 'connector',
          body: 'The knob hole. Most panel-mount rotary knobs and potentiometers use a 6 mm shaft, so you need a 7 mm clearance hole. "Pot" is short for potentiometer — a variable resistor used for volume knobs, brightness controls, etc.',
        },
        {
          term: '12 mm Switch',
          badge: 'connector',
          body: 'The standard size for panel-mount push buttons — the big round buttons on project boxes. 12 mm is the thread diameter. Used for power switches, footswitches, big momentary buttons.',
        },
        {
          term: 'M2 / M2.5 / M3 / M4 / M5',
          badge: 'mounting holes',
          body: 'Metric screw clearance holes for mounting your PCB on standoffs. "M" = metric. The number = shaft diameter in mm. M3 (3.4 mm hole) is the standard for most maker boards. Raspberry Pi uses M2.5 (2.9 mm). Arduino Uno uses M3. Always use the clearance hole size (slightly larger than the screw), not the thread size.',
        },
        {
          term: 'Kerf',
          body: 'Same as in the Box module — the tiny gap the laser burns. Correct this and your connectors fit snugly without rattling. Too small = connector won\'t fit. Too large = connector rocks around. Add 0.1 mm at a time until it\'s right.',
        },
        {
          term: 'Finger Joints',
          body: 'The interlocking tabs on panel edges that hold the enclosure together without glue. Toggle ON for a stronger, more professional result.',
        },
        {
          term: 'Anchor',
          badge: 'power feature',
          body: 'Ties a cutout to a relative position — left edge, centre, right edge — so when you resize the box, the cutout moves with it proportionally. Without an anchor, everything stays at absolute mm coordinates, so resizing the box may push cutouts outside the panel. Centre-anchor anything you want centred; edge-anchor anything that should stay near an edge.',
        },
      ],
      steps: [
        { n: 1, text: 'Measure your PCB or the inside of your components first. Add 5 mm clearance on each side for the box interior dimensions.' },
        { n: 2, text: 'Click the FRONT cell in the panel picker (the cross diagram on the left panel).' },
        { n: 3, text: 'Add your connectors with the + buttons. They appear centred on the panel.' },
        { n: 4, text: 'Drag cutouts to their correct position in the workspace, or type exact X/Y coordinates.' },
        { n: 5, text: 'Set an ANCHOR on each cutout so resizing the box won\'t move them off-panel.' },
        { n: 6, text: 'Add M3 (or M2.5 for Raspberry Pi) mounting holes using the SCREWS section.' },
        { n: 7, text: 'Export each panel as SVG or all panels as DXF. Label the panels before cutting.' },
      ],
      tips: [
        'Measure your actual connectors with calipers — tolerances vary by brand. A USB-C socket from a cheap supplier might be 0.3 mm wider than spec.',
        'Add 0.2–0.5 mm kerf for connector holes specifically. You want the connector to snap in snugly, not fall through.',
        'PCB standoff spacing: Raspberry Pi 4 = 58 × 49 mm (M2.5). Arduino Uno = 68.58 × 53.34 mm (M3). Use the PCB MOUNT helper button.',
        'Use the 3D view to check cutout positions look right before cutting anything.',
        'For ventilation, add a grid of 2–3 mm holes (use the circle cutout type) near heat-producing components.',
      ],
      trivia: [
        'The USB standard was created in 1994 specifically to replace the chaos of serial, parallel, PS/2, ADB, and other connector standards. It was designed by a team led by Ajay Bhatt at Intel.',
        'The 3.5 mm headphone jack has been around since 1964, originally designed for transistor radio earpieces. It lasted 60 years before phones started removing it.',
        'The XLR connector was invented by James H. Cannon in the 1950s. The X, L, and R stood for specific design features of the locking mechanism — not for any words you\'d recognise.',
        'The Raspberry Pi\'s unusual M2.5 mounting holes (instead of standard M3) was a deliberate decision to make the board harder to damage — M2.5 bolts are less likely to overtighten and crack the PCB.',
        'The D-sub connector family (DB-9, DB-15, DB-25) was introduced by Cannon (same company as XLR) in 1952. The "D" refers to the D-shaped metal shell that surrounds the pins.',
      ],
    },

  };

  $effect(() => {
    if (!(active in GUIDES)) selectedOverride = 'box';
  });

  const guide = $derived(GUIDES[active] ?? GUIDES['box']);

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose();
  }
  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window onkeydown={handleKey} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="backdrop" role="presentation" onclick={handleBackdrop}>
  <div class="panel" role="dialog" aria-modal="true" aria-label="Fabrication Guide">

    <!-- ── Sidebar ────────────────────────────────────────── -->
    <nav class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-wordmark">GUIDE</div>
        <div class="sidebar-sub">Fabrication Reference</div>
      </div>

      {#each MODULES as mod}
        <button
          class="nav-btn {active === mod.id ? 'active' : ''}"
          onclick={() => selectedOverride = mod.id}
        >
          <span class="nav-label">{mod.label}</span>
          <span class="nav-sub">{mod.sub}</span>
        </button>
      {/each}

      <div class="sidebar-footer">
        <button class="close-btn" onclick={onclose}>CLOSE  ✕</button>
      </div>
    </nav>

    <!-- ── Content ────────────────────────────────────────── -->
    <div class="content">

      <!-- Hero -->
      <div class="hero" style="border-left: 3px solid {guide.color}">
        <div class="hero-title" style="color:{guide.color}">{guide.title}</div>
        <div class="hero-tagline">{guide.tagline}</div>
      </div>

      <!-- What is this? -->
      <section class="section">
        <div class="section-head">WHAT IS THIS?</div>
        <p class="body-text">{guide.what}</p>
        <div class="analogy-block">
          <span class="analogy-label">THINK OF IT LIKE</span>
          <p class="analogy-text">{guide.analogy}</p>
        </div>
      </section>

      <!-- Key Terms -->
      <section class="section">
        <div class="section-head">KEY TERMS  <span class="section-sub">plain-language definitions</span></div>
        <div class="terms-grid">
          {#each guide.terms as t}
            <div class="term-card">
              <div class="term-top">
                <span class="term-name">{t.term}</span>
                {#if t.badge}
                  <span class="term-badge">{t.badge}</span>
                {/if}
              </div>
              <p class="term-body">{t.body}</p>
            </div>
          {/each}
        </div>
      </section>

      <!-- Getting Started -->
      <section class="section">
        <div class="section-head">GETTING STARTED  <span class="section-sub">step by step</span></div>
        <ol class="steps-list">
          {#each guide.steps as s}
            <li class="step">
              <span class="step-n">{s.n}</span>
              <span class="step-text">{s.text}</span>
            </li>
          {/each}
        </ol>
      </section>

      <!-- Tips -->
      <section class="section">
        <div class="section-head">TIPS &amp; TRICKS</div>
        <ul class="tips-list">
          {#each guide.tips as tip}
            <li class="tip">{tip}</li>
          {/each}
        </ul>
      </section>

      <!-- Trivia -->
      <section class="section section-last">
        <div class="section-head">DID YOU KNOW?</div>
        <ul class="trivia-list">
          {#each guide.trivia as t}
            <li class="trivia-item">{t}</li>
          {/each}
        </ul>
      </section>

    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed; inset: 0;
    background: rgba(12,12,11,.75);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex; align-items: center; justify-content: center;
  }

  .panel {
    display: flex;
    width: min(980px, calc(100vw - 32px));
    max-height: calc(100vh - 48px);
    background: #F6F5F3;
    border: 1px solid #E2E1DC;
    overflow: hidden;
  }

  /* ── Sidebar ─────────────────────────────── */
  .sidebar {
    width: 200px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #E2E1DC;
    background: #EDECE9;
  }

  .sidebar-header {
    padding: 24px 18px 16px;
    border-bottom: 1px solid #E2E1DC;
  }
  .sidebar-wordmark {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 16px; font-weight: 600;
    letter-spacing: 0.14em; color: #0C0C0B;
  }
  .sidebar-sub {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; color: #86857F;
    letter-spacing: 0.12em; margin-top: 4px;
  }

  .nav-btn {
    display: flex; flex-direction: column;
    align-items: flex-start; gap: 2px;
    padding: 12px 18px;
    border: none; border-bottom: 1px solid #E2E1DC;
    background: transparent; cursor: pointer;
    text-align: left; transition: background .1s;
  }
  .nav-btn:hover { background: #E8E7E4; }
  .nav-btn.active { background: #F6F5F3; border-left: 3px solid var(--orange); padding-left: 15px; }

  .nav-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px; font-weight: 600;
    letter-spacing: 0.1em; color: #0C0C0B;
  }
  .nav-sub {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; color: #86857F;
    letter-spacing: 0.06em;
  }

  .sidebar-footer {
    margin-top: auto;
    padding: 14px 18px;
    border-top: 1px solid #E2E1DC;
  }
  .close-btn {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px; letter-spacing: 0.1em;
    color: #5C5B57; border: 1px solid #CCCBC7;
    padding: 7px 12px; width: 100%;
    background: none; cursor: pointer;
    transition: all .12s;
  }
  .close-btn:hover { color: #0C0C0B; border-color: #86857F; }

  /* ── Content ─────────────────────────────── */
  .content {
    flex: 1;
    overflow-y: auto;
    padding: 0;
    scrollbar-width: thin;
    scrollbar-color: #CCCBC7 transparent;
  }

  .hero {
    padding: 28px 36px 24px;
    border-bottom: 1px solid #E2E1DC;
    background: #F6F5F3;
  }
  .hero-title {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 20px; font-weight: 600;
    letter-spacing: 0.1em; margin-bottom: 8px;
  }
  .hero-tagline {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 15px; color: #3C3B38;
    line-height: 1.55; max-width: 520px;
  }

  .section {
    padding: 28px 36px;
    border-bottom: 1px solid #E8E7E4;
  }
  .section-last { border-bottom: none; }

  .section-head {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px; font-weight: 600;
    letter-spacing: 0.18em; color: #3C3B38;
    text-transform: uppercase;
    margin-bottom: 16px;
    display: flex; align-items: center; gap: 10px;
  }
  .section-sub {
    font-weight: 400; font-size: 10px;
    color: #AEADA9; letter-spacing: 0.1em;
    text-transform: none;
  }

  .body-text {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 14px; color: #3C3B38;
    line-height: 1.65; margin-bottom: 16px;
  }

  .analogy-block {
    background: #EDECE9;
    border-left: 3px solid #CCCBC7;
    padding: 14px 16px;
    margin-top: 4px;
  }
  .analogy-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px; font-weight: 600;
    letter-spacing: 0.2em; color: #86857F;
    display: block; margin-bottom: 6px;
  }
  .analogy-text {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px; color: #5C5B57;
    line-height: 1.6; margin: 0;
    font-style: italic;
  }

  /* Terms */
  .terms-grid {
    display: flex; flex-direction: column; gap: 1px;
    background: #E2E1DC;
    border: 1px solid #E2E1DC;
  }
  .term-card {
    background: #F6F5F3;
    padding: 14px 16px;
    transition: background .1s;
  }
  .term-card:hover { background: #EDECE9; }
  .term-top {
    display: flex; align-items: center;
    justify-content: space-between; gap: 10px;
    margin-bottom: 6px;
  }
  .term-name {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px; font-weight: 600;
    color: #0C0C0B; letter-spacing: 0.02em;
  }
  .term-badge {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px; font-weight: 600;
    letter-spacing: 0.14em;
    color: var(--orange, #C05430);
    background: rgba(232,93,4,.08);
    padding: 2px 7px;
    white-space: nowrap;
  }
  .term-body {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px; color: #3D3D3A;
    line-height: 1.6; margin: 0;
  }

  /* Steps */
  .steps-list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
  .step {
    display: flex; align-items: flex-start; gap: 14px;
    padding: 12px 16px;
    background: #EDECE9; border-left: 3px solid transparent;
  }
  .step:nth-child(odd) { border-left-color: #CCCBC7; }
  .step-n {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 16px; font-weight: 600;
    color: var(--orange, #C05430);
    min-width: 24px; line-height: 1.4;
    flex-shrink: 0;
  }
  .step-text {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px; color: #3C3B38;
    line-height: 1.6;
  }

  /* Tips */
  .tips-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
  .tip {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px; color: #3C3B38; line-height: 1.6;
    padding: 10px 14px 10px 38px;
    background: rgba(26,122,63,.05);
    border-left: 3px solid #1A7A3F;
    position: relative;
  }
  .tip::before {
    content: '→';
    position: absolute; left: 14px; top: 10px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px; color: #1A7A3F;
  }

  /* Trivia */
  .trivia-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
  .trivia-item {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px; color: #5C5B57; line-height: 1.6;
    padding: 10px 14px 10px 38px;
    background: #EDECE9;
    border-left: 3px solid #AEADA9;
    position: relative;
  }
  .trivia-item::before {
    content: '✦';
    position: absolute; left: 13px; top: 11px;
    font-size: 10px; color: #AEADA9;
  }
</style>
