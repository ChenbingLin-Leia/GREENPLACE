// ========== global variables ==========
// basic variables
let canvas;
let currentLetter = 1;
let plasticCounts = {P:0, L:0, A:0, S:0, T:0, I:0, C:0};
// user variables
let userName = {first: "", last: "", gender: ""};
let userTendency = 0;
let earlyChoices = [null, null, null]; // 记录前三封信的选择：'A' 或 'B'
// texture variables
let plasticTextures = [];
let enterTexture;
// music variables
let bgMusic;
let bgNature;
let bgMachine;
let isMusicPlaying = false;
// keyboard layout：P→L→A→S→T→I→C→Enter
let keyboardLayout = [
  { letter: 'P', col: 0, row: 0 },// top left
  { letter: 'L', col: 1, row: 0 },// top center
  { letter: 'A', col: 2, row: 0 },// top right
  { letter: 'S', col: 2, row: 1 },// middle right
  { letter: 'T', col: 1, row: 1 },// center
  { letter: 'I', col: 0, row: 1 },// middle left
  { letter: 'C', col: 0, row: 2 },// left bottom
  { letter: 'Enter', col: 1, row: 2, width: 2, height: 1 }// bottom center and right combined
];
// building variables
let buildings = []; 
let previousRoundCount = 0;
// building layout
let predefinedPositions = [
    // initial first building
  { x: 0, y: 0, widthFactor: 0.1, heightFactor: 0.1 }, // position for first building
    // extra buildings
  { x: 0.75, y: 0.65, widthFactor: 0.1, heightFactor: 0.1 },  // position 1
  { x: 0.85, y: 0.55, widthFactor: 0.1, heightFactor: 0.1 },  // position 2
  { x: 0.65, y: 0.45, widthFactor: 0.1, heightFactor: 0.1 },  // position 3
  { x: 0.80, y: 0.35, widthFactor: 0.1, heightFactor: 0.1 },  // position 4
  { x: 0.57, y: 0.50, widthFactor: 0.1, heightFactor: 0.1 },  // position 5
  { x: 0.50, y: 0.40, widthFactor: 0.1, heightFactor: 0.1 },  // position 6
  { x: 0.80, y: 0.50, widthFactor: 0.1, heightFactor: 0.1 },  // position 7
];
// character variables
let character = {
  x: 0, // current character X (bottom center of body)
  y: 0, // current character Y (bottom center of body)
  initX: 0, // initial position X
  initY: 0, // initial position Y
  headDiameter: 0, // head diameter
  bodyHeight: 0, // body height
  topBase: 0, // top base length
  bottomBase: 0, // bottom base length
  moveSpeed: 3, // move-speed
  keysPressed: { // record key presses
    w: false,
    a: false,
    s: false,
    d: false
  }
};
let CharacterColors = {
  startColor: { r: 224, g: 166, b: 21 },   // #e0a615 (去掉alpha)
  endColor: { r: 99, g: 124, b: 80 },      // #637c50
  currentColor: { r: 224, g: 166, b: 21 }, // 当前颜色
};

// WASD hint variables
let showWASDHint = true; // 是否显示WASD提示
let wasdHintAlpha = 0;   // 透明度值
let wasdHintPhase = 0;   // 透明度变化相位 (0-1)
let wasdHintSpeed = 0.01; // 透明度变化速度

// ========== preload function ==========
function preload() {
    //texture preload
    //keyboard texture preload
    for (let i = 0; i < 7; i++) {
    plasticTextures[i] = loadImage(`assets/image/plastic${i+1}.png`);
    }
    //enter texture preload
    enterTexture = loadImage('assets/image/enter.png');
    //music preload
    //background music preload
    bgMusic = loadSound('assets/audio/backgroundMusic.mp3', () => {
    console.log("background music successfully loaded");
    }, (error) => {
    console.error("background music failed to load:", error);
    });
    //background nature sound preload
    bgNature = loadSound('assets/audio/backgroundNature.m4a',
    () => console.log("Nature sound loaded successfully"),
    (error) => console.error("Nature sound failed to load:", error)
    );
    //background machine sound preload
    bgMachine = loadSound('assets/audio/backgroundMachine.wav',
    () => console.log("Machine sound loaded successfully"),
    (error) => console.error("Machine sound failed to load:", error)
    );
}
// ========== colorizeText function ==========
function colorizeText(text) {
  return text.replace(/([PLASTIC])(?![^<]*?>)/gi, (match) => {
    const count = plasticCounts[match.toUpperCase()] || 0;
    if (count === 0) {
      return match;
    }
    
    const maxCount = 8;
    const intensity = Math.min(1, count / maxCount);
    const dramaticIntensity = Math.pow(intensity, 0.3); // more aggressive curve
    // basic color #637c50
    const r = Math.floor(99 * dramaticIntensity);
    const g = Math.floor(124 * dramaticIntensity);
    const b = Math.floor(80 * dramaticIntensity);
    // light color
    const pulseR = Math.min(255, r + 20);
    const pulseG = Math.min(255, g + 20);
    const pulseB = Math.min(255, b + 20);
    // animation parameters: faster pulse, stronger effect
    const animationSpeed = 0.7 + intensity * 1.3; // 0.7-2.0 seconds
    const animationIntensity = 0.7 + intensity * 0.3; // 0.7-1.0 (always strong effect)
    
    return `<span class="plastic-pulse" style="
      color: rgb(${r}, ${g}, ${b});
      --pulse-r: ${pulseR};
      --pulse-g: ${pulseG};
      --pulse-b: ${pulseB};
      --pulse-intensity: ${animationIntensity};
      --pulse-speed: ${animationSpeed}s;
    ">${match}</span>`;
  });
}

// ========== p5.js core functions ==========
function setup() {
    //canvas setup
    canvas = createCanvas(windowWidth, windowHeight * 0.5);
    canvas.parent('p5-canvas');
    //text setup
    textFont('Courier New');
    textAlign(CENTER, CENTER);
    const startBtn = select('#start-btn');
    startBtn.mousePressed(switchToMain);
    //audio playing ensurance
    let isAudioPlaying = false;
    document.addEventListener('click', () => {
    if (!isAudioPlaying) {
      // Resume audio context after user interacted
      getAudioContext().resume().then(() => {
        console.log("Audio context resumed");
      });
    }
  });
  // 重新测试按钮事件
    const retakeBtn = select('#retake-test');
    if (retakeBtn) {
        retakeBtn.mousePressed(retakeTest);
    }
}
function draw() {
  // 设置背景色
  background(246, 245, 221); // #f6f5dd color
  
  // 1. 绘制阴影效果（在最底层）
  drawShadowEffect();
  
  // 2. 绘制覆盖矩形（覆盖键盘区域，避免阴影与键盘重叠）
  drawCoverRect();
  
  // 3. 绘制键盘
  drawKeyboard(); 
  
  // 4. 绘制所有建筑
  drawAllBuildings();
  
  // 5. 更新和绘制小人
  updateCharacterPosition();
  drawCharacter();
  
  // 6. 绘制状态信息
  drawStatusInfo();
  
  // 7. 绘制WASD移动提示
  if (showWASDHint) {
    // 更新WASD提示透明度
    wasdHintPhase = (wasdHintPhase + wasdHintSpeed) % 1;
    // 使用正弦函数实现平滑的0→255→0循环
    wasdHintAlpha = sin(wasdHintPhase * TWO_PI) * 127.5 + 127.5;
    
    drawWASDHint();
  }
}

// ========== switch functions ==========
function switchToMain() {
    userName.first = select('#first-name').value();
    userName.last = select('#last-name').value();
    userName.gender = select('#gender').value();
    
    if (!userName.first || !userName.last || !userName.gender) {
        alert("Please fill in all your informations before starting.");
        return;
    }
    
    select('#start-screen').addClass('hidden');
    select('#main-screen').removeClass('hidden');
    
    //play background music
    startAllAudio();
    //load first letter
    loadLetter(1);
}
function switchToEnd() {
  // Hide main screen, show ending screen
  select('#main-screen').addClass('hidden');
  select('#end-screen').removeClass('hidden');
  
  // Adjust audio for ending
  stopBackgroundAudio();
  setMusicVolume(0.15); // 15% volume
  
  // Play completion sound
  playCompletionSound();
  
  // 获取完成的轮数
  const completedRounds = updateCompletedRounds();
  
  // 计算兼容性分数（只计算一次）
  const compatibilityScore = calculateCompatibilityScore();
  
  // 获取兼容性反馈（传递分数避免重复计算）
  const feedback = getCompatibilityFeedback(compatibilityScore);
  
  // 计算思维倾向百分比 (userTendency/50*100%)
  const innovationPercentage = Math.min(100, Math.max(0, (userTendency / 50) * 100));
  
  // Show shareholder report
  let reportContent = select('#report-content');
  
  reportContent.html(`
    <h2>GREENPLACE Shareholder Compatibility Report</h2>
    <p>Candidate: ${userName.first} ${userName.last}</p>
    <p>Compatibility Score: ${compatibilityScore}%</p>
    <p>Your PLASTIC Progress:</p>
    <p>Completed Rounds: ${completedRounds}</p>
    <p>PLASTIC Accumulation:</p>
    <p>P: ${plasticCounts.P} | L: ${plasticCounts.L} | A: ${plasticCounts.A} | S: ${plasticCounts.S} | T: ${plasticCounts.T} | I: ${plasticCounts.I} | C: ${plasticCounts.C}</p>
    <p>${feedback}</p>
  `);
  
  // 更新圆形思维倾向进度环
  updateCircularProgressBar(innovationPercentage);
}

// ========== audio functions ==========
function startAllAudio() {
  // start background music (30% volume)
  if (bgMusic && !bgMusic.isPlaying()) {
    bgMusic.setVolume(0.3);
    bgMusic.loop();
    console.log("Background music started");
  }
  // start nature sound (left channel, 100% volume)
  if (bgNature && !bgNature.isPlaying()) {
    bgNature.setVolume(1.0);
    bgNature.pan(-0.8); // left channel pan
    bgNature.loop();
    console.log("Nature sound started (left channel)");
  }
  // start machine sound (right channel, 20% volume)
  if (bgMachine && !bgMachine.isPlaying()) {
    bgMachine.setVolume(0.2);
    bgMachine.pan(0.8); // right channel pan
    bgMachine.loop();
    console.log("Machine sound started (right channel)");
  }
  isAudioPlaying = true;
  // Set initial volume based on the first letter
  updateBackgroundAudioVolumes(1);
}
function updateBackgroundAudioVolumes(letterNumber) {
  // Calculate gradient parameters: 6 letters, from 1 to 6
  // Nature sound: 100% → 0% linear decrease
  // Machine sound: 0% → 20% linear increase
  const totalLetters = 6;
  const progress = (letterNumber - 1) / (totalLetters - 1); // 0 to 1
  // Nature sound volume: linear decrease from 1.0 to 0.0
  const natureVolume = 1.0 * (1 - progress);
  // Machine sound volume: linear increase from 0.0 to 0.2
  const machineVolume = 0.2*(0.0 + progress);
  // Apply volumes
  if (bgNature) {
    bgNature.setVolume(natureVolume * 1.0); // Maintain 100% channel volume
    console.log(`Nature sound volume: ${(natureVolume * 100).toFixed(0)}%`);
  }
  if (bgMachine) {
    bgMachine.setVolume(machineVolume * 0.2); // Maintain 20% channel volume
    console.log(`Machine sound volume: ${(machineVolume * 100).toFixed(0)}%`);
  }
  // Log current volume states (for debugging)
  console.log(`Letter ${letterNumber} - Nature sound: ${(natureVolume*100).toFixed(0)}%, Machine sound: ${(machineVolume*100).toFixed(0)}%`);
}
function stopBackgroundAudio() {
  // stop nature & machine sounds
  if (bgNature && bgNature.isPlaying()) {
    bgNature.stop();
    console.log("Nature sound stopped");
  }
  if (bgMachine && bgMachine.isPlaying()) {
    bgMachine.stop();
    console.log("Machine sound stopped");
  }
  isAudioPlaying = false;
}
function setMusicVolume(volume) {
  if (bgMusic && bgMusic.isPlaying()) {
    bgMusic.setVolume(volume);
    console.log(`Background music volume set to: ${volume * 100}%`);
  }
}

// ========== user information functions ==========
function getSalutation() {
    const salutations = {
        'male': 'Mr.',
        'female': 'Ms.',
        'other': '',
        '': ''
    };
    return salutations[userName.gender] || '';
}
function getDirectAddress() {
    const addresses = {
        'male': 'Sir',
        'female': 'Madam',
        'other': '',
        '': ''
    };
    return addresses[userName.gender] || '';
}

// ========== load function ==========
// letter loader
function loadLetter(letterNumber) {
  console.log(`=== Loading letter ${letterNumber} ===`);
  currentLetter = letterNumber;
  let letterContent = select('#letter-content');
  let optionsContainer = select('#options-container');
  letterContent.html('');
  optionsContainer.html('');
  // update character
  updateBodyDimensions();
  updateCharacterColor();
  // update background audio volumes
  updateBackgroundAudioVolumes(letterNumber);
  switch(letterNumber) {
    case 1:
      console.log("Calling showLetter1");
      showLetter1();
      break;
    case 2:
      console.log("Calling showLetter2");
      showLetter2();
      break;
    case 3:
      console.log("Calling showLetter3");
      showLetter3();
      break;
    case 4:
      console.log("Calling showLetter4");
      showLetter4();
      break;
    case 5:
      console.log("Calling showLetter5");
      showLetter5();
      break;
    case 6:
      console.log("Calling showLetter6");
      showLetter6();
      break;
    default:
      console.log("Default case - showing placeholder");
      letterContent.html('<p>Letter content will appear here.</p>');
  }
  console.log(`=== letter ${letterNumber} successfully loaded ===`);
}
// option loader
function loadOption(letterNum, option) {
  console.log("🔥 optionLoader CALLED!");
  console.log(`letterNum: ${letterNum}, option: ${option}`);
  // update plastic counts and user tendency
  updatePlasticCounts(option, letterNum);
  updateUserTendency(option, letterNum);
  // check completed rounds
  const newRoundCount = updateCompletedRounds();
  console.log(`new round count: ${newRoundCount}, previous round count: ${previousRoundCount}`);
  // load next letter or show ending
  if (letterNum < 6) {
    loadLetter(letterNum + 1);
  } else {
    showEnding();
  }
}
// preload letter content and options
// letter1 (2010, 10)
function showLetter1() {
  let letterContent = select('#letter-content');
  let optionsContainer = select('#options-container');
    
  // initialize building
  initPredefinedPositions();
  if (buildings.length === 0) {
    const initialBuilding = createNewBuilding(0);
    buildings.push(initialBuilding);
    previousRoundCount = 0; // Set to 0 because there are no completed rounds yet
    console.log("first building initialized");
  }
  // initualize character
  initCharacter();

  // Letter1 content
    const rawLetterText = `
      <p>Dear ${userName.first},</p>
      <p>That is your name, right? Dad told me you're his close colleague and I can talk to you about anything.</p>
      <p>Today at school, our teacher taught us about the importance of trees. She said real trees clean the air and provide homes for birds. But people from GREENPLACE came to give a presentation at our school, saying their artificial trees are better because they never die and don't need water.</p>
      <p>I'm confused. Dad works at a paper mill - he comes home every day smelling like wood chips. He says paper production cuts down so many trees, so he thinks GREENPLACE's artificial trees are a great idea to protect forests.</p>
      <p>But my teacher told us that real forests are more than just wood - they're complete homes. If artificial trees are so good, why do we need real trees at all? Both Dad and my teacher seem to make sense.</p>
      <p>Who do you think I should believe?</p>
      <p>Sincerely,<br>Alex (age 10)</p>
    `;
    
    // directly show raw text(no colorized text)
    letterContent.html(rawLetterText);
    // Letter1 options
    optionsContainer.html(`
        <button class="option-btn" id="option-1A">I'm not sure... I like the forest near my home.</button>
        <button class="option-btn" id="option-1B">Idk. Maybe artificial trees are good too?</button>
    `);
    // bind event using p5.js
    select('#option-1A').mousePressed(() => {
        console.log("🔥 Option 1A clicked");
        loadOption(1, 'A');
    });
    select('#option-1B').mousePressed(() => {
        console.log("🔥 Option 1B clicked");
        loadOption(1, 'B');
    });
}
// letter2 (2015, 15)
function showLetter2() {
    let letterContent = select('#letter-content');
    let optionsContainer = select('#options-container');
    
    const salutation = getSalutation();
    const namePrefix = salutation ? `${salutation} ` : '';
    
    // Letter2 content
    const rawLetterText = `
        <p>Dear ${namePrefix}${userName.last},</p>
        <p>It's been five years. I'm in high school now, and things have become even more complicated.</p>
        <p>GREENPLACE is planning to take over our city's landscaping. They say it will create lots of job opportunities and make everything permanently green. Some people held a street protest. Mrs. Henderson next door - the one who grows tomatoes – called GREENPLACE "plastic poison". Dad said her husband had just lost his job, and that's the only reason why she was so aggressive.</p>
        <p>Dad still supports them. He says the paper industry is declining and we need new opportunities. "Opportunity", what a precious word it sounds like. But how could Dad stay so calm, when GREENPLACE was likely to replace his job? I can't help recalling what my biology teacher said years ago, and now hearing these protests, I just don't know ...</p>
        <p>The vote is next month. Should I support GREENPLACE?</p>
        <p>Sincerely,<br>Alex</p>
    `;
    // apply colorized text
    const colorizedText = colorizeText(rawLetterText);
    letterContent.html(colorizedText);
    // Letter2 options
    optionsContainer.html(`
        <button class="option-btn" id="option-2A">You should listen to locals first</button>
        <button class="option-btn" id="option-2B">Support systematic city planning</button>
    `);
    // bind event using p5.js
    select('#option-2A').mousePressed(() => {
        console.log("🔥 Option 2A clicked");
        loadOption(2, 'A');
    });
    select('#option-2B').mousePressed(() => {
        console.log("🔥 Option 2B clicked");
        loadOption(2, 'B');
    });
}
// letter3 (2020, 20)
function showLetter3() {
    let letterContent = select('#letter-content');
    let optionsContainer = select('#options-container');
    
    const salutation = getSalutation();
    const directAddress = getDirectAddress();
    const namePrefix = salutation ? `${salutation} ` : '';
    const addressSuffix = directAddress ? ` ${directAddress},` : '';
    
    // Letter3 content
    const rawLetterText = `
        <p>Dear ${namePrefix}${userName.last},</p>
        <p>Dad passed away last month. The doctor said it was a respiratory disease caused by long-term exposure to microplastics.</p>
        <p>I don't know what to do with this grief. Everything feels meaningless. Dad always said the paper mill was safe, and he was just dealing with wood pulp.${addressSuffix} you also work at the paper mill, don't you? But now... I'm starting to question everything.</p>
        <p>Yesterday, GREENPLACE contacted me. They're offering a scholarship in Dad's name - "The Thomas Memorial Scholarship for Environmental Studies". They said it's to support the next generation and honor his legacy.</p>
        <p>But how can I accept this? The fund from the same company that might have contributed to the pollution that killed him? Yet, turning it down feels like rejecting Dad's memory. I'm so lost.</p>
        <p>What should I do?</p>
        <p>With a heavy heart,<br>Alex (age 20)</p>
    `;
    // apply colorized text
    const colorizedText = colorizeText(rawLetterText);
    letterContent.html(colorizedText);
    // Letter3 options
    optionsContainer.html(`
        <button class="option-btn" id="option-3A">Pursue alternative paths to honor your father's legacy</button>
        <button class="option-btn" id="option-3B">Accept this chance to create positive impact from within</button>
    `);
    // bind event using p5.js
    select('#option-3A').mousePressed(() => {
        console.log("🔥 Option 3A clicked");
        loadOption(3, 'A');
    });
    select('#option-3B').mousePressed(() => {
        console.log("🔥 Option 3B clicked");
        loadOption(3, 'B');
    });
}
// ========== 判断是否进入Version B分支 ==========
function shouldShowVersionB() {
  // 统计前三封信中选择B的次数
  let bCount = 0;
  for (let i = 0; i < 3; i++) {
    if (earlyChoices[i] === 'B') {
      bCount++;
    }
  }
  
  // 如果选择了2个或更多B选项，进入Version B分支
  // 即：userTendency >= 20（因为每个B加10分，2个B就是20分）
  const showVersionB = bCount >= 2;
  console.log(`Early choices: ${JSON.stringify(earlyChoices)}, B count: ${bCount}, Show Version B: ${showVersionB}`);
  return showVersionB;
}
// letter4 (2025, 25)
function showLetter4() {
    let letterContent = select('#letter-content');
    let optionsContainer = select('#options-container');
    
    const salutation = getSalutation();
    const namePrefix = salutation ? `${salutation} ` : '';
    
    // determine letter version based on user tendency
    let rawLetterText = '';
    if (!shouldShowVersionB()) {
    // Version A (前三封信选择了少于2个B)
        // Version A 
        rawLetterText = `
            <p>Dear ${namePrefix}${userName.last},</p>
            <p>I took the scholarship. And now, I've joined GREENPLACE.</p>
            <p>I know what you're thinking. After everything we've discussed - about Dad, about the protests, about my doubts... it feels like betrayal. But I keep telling myself: maybe I can do more from the inside. If I'm here, I can push for more transparency, for better practices.</p>
            <p>The training was... intense. They call it "orientation", but it feels like indoctrination. Everything is framed as "progress" and "innovation". When I asked about the microplastics research, they said it's "outdated science" and showed me their own studies.</p>
            <p>Am I fooling myself? Is this just a convenient excuse to take the easy path?</p>
            <p>Sincerely,<br>Alex (age 25)</p>
        `;
    } else {
        // Version B 
        rawLetterText = `
            <p>Dear ${namePrefix}${userName.last},</p>
            <p>I took the scholarship. And now, I've joined GREENPLACE's innovation team.</p>
            <p>You were right to encourage me. This is exactly where I belong. The technology we're developing is incredible - the self-cleaning artificial forest can absorb twice as much CO2 as a natural one. Dad would be so proud of his son if he sees this.</p>
            <p>The energy here is electric. Everyone is so passionate about creating a sustainable future. When I mentioned the old microplastics concerns, my mentor laughed and said those were debunked years ago. It's amazing how much misinformation was circulating back then.</p>
            <p>Finally, I feel like I'm making a difference. Thank you for believing in me.</p>
            <p>Best regards,<br>Alex (age 25)</p>
        `;
    }
    // apply colorized text
    const colorizedText = colorizeText(rawLetterText);
    letterContent.html(colorizedText);
    // Letter4 options
    optionsContainer.html(`
        <button class="option-btn" id="option-4A">Stay critical while seeking solutions</button>
        <button class="option-btn" id="option-4B">Focus on positive impacts you can create</button>
    `);
    // bind event using p5.js
    select('#option-4A').mousePressed(() => {
        console.log("🔥 Option 4A clicked");
        loadOption(4, 'A');
    });
    select('#option-4B').mousePressed(() => {
        console.log("🔥 Option 4B clicked");
        loadOption(4, 'B');
    });
}
// letter5 (2030, 30)
function showLetter5() {
    let letterContent = select('#letter-content');
    let optionsContainer = select('#options-container');
    
    const salutation = getSalutation();
    const namePrefix = salutation ? `${salutation} ` : '';
    
    // determine letter version based on user tendency
    let rawLetterText = '';
    if (!shouldShowVersionB()) {
    // Version A (前三封信选择了少于2个B)
        // Version A 
        rawLetterText = `
            <p>Dear ${namePrefix}${userName.last},</p>
            <p>I was promoted to Regional Manager last month, but I can't celebrate.</p>
            <p>The coughing started three months ago. At first, I thought it was just stress, but now half my team is showing similar symptoms. We compared notes - headaches, fatigue, and this persistent dry cough. The company clinic calls it "adjustment phase symptoms".</p>
            <p>But I found something. An old personnel file from Dad's time. He wasn't working at a paper mill. He was here, at GREENPLACE, in the raw materials division, for fifteen years.</p>
            <p>All those times he came home smelling like wood chips... was it just a cover? Did he know what this place was doing to him? To us?</p>
            <p>The official health report comes out next week. Should I try to find your health report in the "paper mill", too?</p>
            <p>Sincerely,<br>Alex (age 30)</p>
        `;
    } else {
        // Version B
        rawLetterText = `
            <p>Dear ${namePrefix}${userName.last},</p>
            <p>I've been promoted to Regional Manager. It's everything I've worked for.</p>
            <p>But I have to be honest - I've been feeling unwell lately. The doctors say it's just stress from the new position, and most of my team is experiencing similar adjustment symptoms. It sounds convincing; I hope this is the truth.</p>
            <p>I did stumble upon something confusing though. While organizing the archive, I found Dad's old employment records. It seems he actually worked here at GREENPLACE, not at the paper mill. The timing is awkward with the health report coming out next week. I think I should find the truth.</p>
            <p>At least you were working at the paper mill, weren't you?</p>
            <p>Best regards,<br>Alex (age 30)</p>
        `;
    }
    // apply colorized text
    const colorizedText = colorizeText(rawLetterText);
    letterContent.html(colorizedText);
    // Letter5 options
    optionsContainer.html(`
        <button class="option-btn" id="option-5A">...I'm sorry for your loss.</button>
        <button class="option-btn" id="option-5B">...Alex, please be rational.</button>
    `);
    // bind event using p5.js
    select('#option-5A').mousePressed(() => {
        console.log("🔥 Option 5A clicked");
        loadOption(5, 'A');
    });
    select('#option-5B').mousePressed(() => {
        console.log("🔥 Option 5B clicked");
        loadOption(5, 'B');
    });
}
// letter6 (2035, 35, one week later) 
function showLetter6() {
    let letterContent = select('#letter-content');
    let optionsContainer = select('#options-container');
    
    const salutation = getSalutation();
    const namePrefix = salutation ? `${salutation} ` : '';
    
    // determine letter version based on user tendency
    let rawLetterText = '';
    if (!shouldShowVersionB()) {
    // Version A (前三封信选择了少于2个B)
        // Version A 
        rawLetterText = `
            <p>${namePrefix}${userName.last},</p>
            <p>I couldn't find your health report in the system. But it doesn't matter anymore.</p>
            <p>I know who you are now. Or rather, what you represent. You're not just a paper mill worker, are you? You've been watching me all along, testing my responses, measuring my compliance. Dad must have known this, too.</p>
            <p>I'm not angry though. Why would I be? GREENPLACE owns everything now - the air we breathe, the green we see, the truth we're allowed to know. Resistance is as meaningless as real leaves in this utopian world.</p>
            <p>I've submitted my resignation. They say it will take a week to process. I don't care about the paperwork. You've won.</p>
            <p>And I'll leave the city tomorrow.</p>
            <p>Farewell,<br>Alex</p>
        `;
    } else {
        // Version B
        rawLetterText = `
            <p>Dear ${namePrefix}${userName.last},</p>
            <p>I couldn't find your health report. But I found mine.</p>
            <p>Stage four pulmonary fibrosis. The doctor gave me six months, but we both know it will be less. The microplastics have woven themselves into my lungs like synthetic ivy, slowly suffocating me from within.</p>
            <p>I should have known. All the signs were there - Dad's death, the coughing, the company's evasions. But I wanted so badly to believe in the beautiful lie, that we could have our technology and our lives at the same time.</p>
            <p>There's no point fighting anymore. The truth doesn't matter when you're already dead. People will continue believing in GREENPLACE's plastic paradise.</p>
            <p>This will be my last letter. Tomorrow morning, I'll be standing on the rooftop of the GREENPLACE headquarters. Maybe on the way down, I'll finally be able to tell the difference between their plastic leaves and the real ones.</p>
            <p>Goodbye,<br>Alex</p>
        `;
    }
    // apply colorized text
    const colorizedText = colorizeText(rawLetterText);
    letterContent.html(colorizedText);
    // directly show ending(no options)
    optionsContainer.html(`
        <button class="option-btn" id="continue-to-report">Continue to Shareholder Report</button>
    `);
    // bind event using p5.js
    select('#continue-to-report').mousePressed(() => {
        console.log("🔥 Continue to report clicked");
        switchToEnd();
    });
}

// ========= update functions ==========
// update plastic counts based on option and letter number
function updatePlasticCounts(option, letterNum) {
    console.log(`📊 updatePlasticCounts with letterNum: ${letterNum}, option: ${option}`);
    // keep original counts for debugging
    const originalCounts = {...plasticCounts};
    // update plastic counts based on option and letter number
    switch(letterNum) {
        case 1:
            console.log("Case 1 - First letter options");
            if (option === 'A') {
                console.log("Option A selected");
                // "I'm not sure... I like the forest near my home."
                plasticCounts.L += 1;
                plasticCounts.A += 1;
                plasticCounts.S += 2;
                plasticCounts.T += 2;
                plasticCounts.I += 3;
                console.log("Added: L+1, A+1, S+2, T+2, I+3");
            } else if (option === 'B') {
                console.log("Option B selected");
                // "Idk. Maybe artificial trees are good too?"
                plasticCounts.L += 1;
                plasticCounts.A += 4;
                plasticCounts.S += 1;
                plasticCounts.T += 3;
                plasticCounts.I += 4;
                plasticCounts.C += 1;
                console.log("Added: L+1, A+4, S+1, T+3, I+4, C+1");
            }
            break;
        case 2:
            console.log("Case 2 - Second letter options");
            if (option === 'A') {
                // "You should listen to locals first"
                plasticCounts.P += 0;
                plasticCounts.L += 4;
                plasticCounts.A += 1;
                plasticCounts.S += 4;
                plasticCounts.T += 2;
                plasticCounts.I += 2;
                plasticCounts.C += 1;
                console.log("Added: L+4, A+1, S+4, T+2, I+2, C+1");
            } else if (option === 'B') {
                // "Support systematic city planning"
                plasticCounts.P += 3;
                plasticCounts.L += 1;
                plasticCounts.A += 2;
                plasticCounts.S += 3;
                plasticCounts.T += 4;
                plasticCounts.I += 3;
                plasticCounts.C += 2;
                console.log("Added: P+3, L+1, A+2, S+3, T+4, I+3, C+2");
            }
            break;
        case 3:
            console.log("Case 3 - Third letter options");
            if (option === 'A') {
                // "Pursue alternative paths to honor your father's legacy"
                plasticCounts.P += 2;
                plasticCounts.L += 2;
                plasticCounts.A += 5;
                plasticCounts.S += 3;
                plasticCounts.T += 4;
                plasticCounts.I += 1;
                plasticCounts.C += 2;
                console.log("Added: P+2, L+2, A+5, S+3, T+4, I+1, C+2");
            } else if (option === 'B') {
                // "Accept this chance to create positive impact from within"
                plasticCounts.P += 2;
                plasticCounts.L += 0;
                plasticCounts.A += 3;
                plasticCounts.S += 2;
                plasticCounts.T += 6;
                plasticCounts.I += 6;
                plasticCounts.C += 4;
                console.log("Added: P+2, L+0, A+3, S+2, T+6, I+6, C+4");
            }
            break;
        case 4:
            console.log("Case 4 - Fourth letter options");
            if (option === 'A') {
                // "Stay critical while seeking solutions"
                plasticCounts.P += 0;
                plasticCounts.L += 3;
                plasticCounts.A += 2;
                plasticCounts.S += 4;
                plasticCounts.T += 3;
                plasticCounts.I += 5;
                plasticCounts.C += 2;
                console.log("Added: L+3, A+2, S+4, T+3, I+5, C+2");
            } else if (option === 'B') {
                // "Focus on positive impacts you can create"
                plasticCounts.P += 2;
                plasticCounts.L += 0;
                plasticCounts.A += 3;
                plasticCounts.S += 3;
                plasticCounts.T += 3;
                plasticCounts.I += 3;
                plasticCounts.C += 4;
                console.log("Added: P+2, L+0, A+3, S+3, T+3, I+3, C+4");
            }
            break;
        case 5:
            console.log("Case 5 - Fifth letter options");
            if (option === 'A') {
                // "...I'm sorry for your loss."
                plasticCounts.P += 0;
                plasticCounts.L += 1;
                plasticCounts.A += 0;
                plasticCounts.S += 3;
                plasticCounts.T += 0;
                plasticCounts.I += 1;
                plasticCounts.C += 0;
                console.log("Added: P+0, L+1, A+0, S+3, T+0, I+1, C+0");
            } else if (option === 'B') {
                // "...Alex, please be rational."
                plasticCounts.P += 1;
                plasticCounts.L += 3;
                plasticCounts.A += 4;
                plasticCounts.S += 1;
                plasticCounts.T += 1;
                plasticCounts.I += 1;
                plasticCounts.C += 0;
                console.log("Added: P+1, L+3, A+4, S+1, T+1, I+1, C+0");
            }
            break;
        default:
            console.log(`No case for letterNum: ${letterNum}`);
    }
    
    // 只保留一份日志代码
    console.log("PLASTIC counts变化:", 
        Object.keys(plasticCounts).map(letter => 
            `${letter}: ${originalCounts[letter]} → ${plasticCounts[letter]}`
        ).join(', ')
    );
    
    // 颜色映射状态
    console.log("颜色映射状态 (#3f692c目标色):");
    Object.keys(plasticCounts).forEach(letter => {
        const count = plasticCounts[letter];
        if (count === 0) {
            console.log(`  ${letter}: ${count}次 - 黑色`);
        } else {
            const maxCount = 8;
            const intensity = Math.min(1, count / maxCount);
            const r = Math.floor(63 * intensity);
            const g = Math.floor(105 * intensity);
            const b = Math.floor(44 * intensity);
            console.log(`  ${letter}: ${count}次 - RGB(${r}, ${g}, ${b})`);
        }
    });
    
    // 触发Canvas重绘
    redraw();
}
// update user tendency based on option and letter number
function updateUserTendency(option, letterNum) {
  // Update user tendency based on option
  // 新规则：每封信选择optionA加0分，选择optionB加10分
  // userTendency将变为[0, 50]之间的整数（5封信×10分）
  
  if (option === 'A') {
    userTendency += 0; // 选择A不加分
  } else if (option === 'B') {
    userTendency += 10; // 选择B加10分
  }
  
  // 记录前三封信的选择
  if (letterNum >= 1 && letterNum <= 3) {
    earlyChoices[letterNum - 1] = option; // 记录选择
    console.log(`Early choice for letter ${letterNum}: ${option}`);
  }
  
  console.log("User tendency updated:", userTendency);
  console.log("Early choices:", earlyChoices);
}
// update completed rounds based on plastic counts
function updateCompletedRounds() {
  // find the minimum count among PLASTIC letters
  const counts = Object.values(plasticCounts);
  if (counts.length === 0) return 0;
  const minCount = Math.min(...counts);
  console.log(`updateCompletedRounds: counts=${JSON.stringify(plasticCounts)}, minCount=${minCount}`);
  return minCount;
}
// update current round characters
function updateCurrentRoundCharacters() {
  const completedRounds = updateCompletedRounds();
  let collectedCount = 0;
  // For each letter, if the count is greater than the completed rounds, it is collected in the current round
  Object.values(plasticCounts).forEach(count => {
    if (count > completedRounds) {
      collectedCount++;
    }
  });
  return collectedCount;
}
// end functions
function calculateCompatibilityScore() {
  // 新的兼容性分数计算方法
  // baseScore = 50;
  // tendencyScore = userTendency * 1; // 因为userTendency现在范围是0-50
  // plasticScore = 完成的轮数 * 1 (每完成一轮加1分)
  
  const baseScore = 50;
  
  // tendencyScore: userTendency范围是0-50，乘以1得到0-50分
  const tendencyScore = userTendency * 1;
  
  // plasticScore: 基于完成的轮数，每完成一轮加1分
  const completedRounds = updateCompletedRounds();
  const plasticScore = completedRounds * 1;
  
  // 计算总分
  let totalScore = baseScore + tendencyScore + plasticScore;
  
  // 特别的：如果TotalScore > 100，则CompatibilityScore为99
  // 否则CompatibilityScore = TotalScore
  let compatibilityScore;
  if (totalScore > 100) {
    compatibilityScore = 99;
  } else {
    compatibilityScore = Math.floor(totalScore); // 取整数
  }
  
  console.log(`兼容性分数计算:
    baseScore: ${baseScore}
    tendencyScore: ${tendencyScore} (userTendency: ${userTendency})
    plasticScore: ${plasticScore} (completedRounds: ${completedRounds})
    totalScore: ${totalScore}
    finalScore: ${compatibilityScore}`);
  
  return compatibilityScore;
}
// ========== 更新圆形思维倾向进度环 ==========
function updateCircularProgressBar(innovationPercentage) {
  // 确保创新百分比在0-100之间
  const innovationPct = Math.min(100, Math.max(0, innovationPercentage));
  
  // 计算传统百分比
  const traditionPct = 100 - innovationPct;
  
  // 圆环周长公式：2 * π * r = 2 * π * 45 ≈ 282.74
  // 为了精确，我们使用实际计算值
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  
  // 计算圆弧的dasharray值
  // stroke-dasharray格式："绘制长度 空白长度"
  // 创新部分的绘制长度 = 周长 * (创新百分比/100)
  // 空白长度 = 周长 - 绘制长度
  const dashLength = circumference * (innovationPct / 100);
  const gapLength = circumference - dashLength;
  
  // 更新SVG圆弧的stroke-dasharray
  const foregroundCircle = select('.circular-fg');
  if (foregroundCircle) {
    // 设置stroke-dasharray: "绘制长度 空白长度"
    // 这将从12点钟方向开始绘制，所以我们用transform="rotate(-90 50 50)"将其旋转到3点钟方向
    foregroundCircle.elt.style.strokeDasharray = `${dashLength} ${gapLength}`;
  }
  
  // 更新中心百分比显示
  const progressPercentage = select('#circular-progress-percentage');
  if (progressPercentage) {
    progressPercentage.html(`${Math.round(innovationPct)}%`);
  }
  
  // 更新标签加粗状态
  const traditionLabel = select('#tradition-label');
  const innovationLabel = select('#innovation-label');
  
  if (traditionLabel && innovationLabel) {
    // 先移除所有加粗
    traditionLabel.removeClass('bold');
    innovationLabel.removeClass('bold');
    
    // 根据哪个占比大来加粗对应的标签
    if (traditionPct > innovationPct) {
      traditionLabel.addClass('bold');
    } else if (innovationPct > traditionPct) {
      innovationLabel.addClass('bold');
    } else {
      // 如果相等，都不加粗
    }
  }
  
  console.log(`圆形思维倾向进度环更新:
    创新比例: ${innovationPct}% (dashLength: ${dashLength.toFixed(2)})
    传统比例: ${traditionPct}%
    圆环周长: ${circumference.toFixed(2)}
    stroke-dasharray: ${dashLength.toFixed(2)} ${gapLength.toFixed(2)}
    userTendency: ${userTendency}`);
}
function getCompatibilityFeedback(compatibilityScore) {
    // 如果没有传入分数，则计算一次（保持向后兼容）
    if (compatibilityScore === undefined) {
        compatibilityScore = calculateCompatibilityScore();
    }
    
    console.log(`兼容性反馈 - 分数: ${compatibilityScore}`);
    if (compatibilityScore < 60) {
        console.log("反馈类别: 刻薄评价");
        return "Your choices have demonstrated a conservative perspective. We understand that everyone has their own unique background and experiences. However, to keep up with times, perhaps you could consider being more open to changes.";
    } else if (compatibilityScore < 80) {
        console.log("反馈类别: 鼓励评价");
        return "Your choices have demonstrated balanced thinking. We value your insights and are committed to making meaningful improvements. Every perspective contributes a lot to our growth. Feel free to share your contact information if you'd like to stay connected.";
    } else if (compatibilityScore < 99) {
        console.log("反馈类别: 邀请合作");
        return "Your thinking aligns perfectly with GREENPLACE's vision for a sustainable future! We sincerely invite you to join our team and collaborate with us to create meaningful impact.";
    } else {
        console.log("反馈类别: 极高评价与警示");
        return "Your thinking aligns perfectly with ours at the deepest level. We extend a special invitation for you to join our core leadership team... However, please remember that to achieve substantial long-term benefits, sometimes strategic compromises may be necessary.";
    }
}
function playCompletionSound() {
    console.log("Completion sound played");
}
//////////////////////////////////

// ========== keyboard functions ==========
function drawKeyboard() {
  // calculate keyboard dimensions
  const keyboardWidth = width / 6;   // Total width: 1/6
  const keyboardHeight = height / 2; // Total height: 1/2
  const cellSize = keyboardWidth / 3; // Size of each key
  const keyboardX = (width / 8) - (keyboardWidth / 2);
  const keyboardY = (height*0.4) - (keyboardHeight / 2);
  const padding = 4; // Padding between keys
  // calculate key base positions and draw keys
  keyboardLayout.forEach((key, index) => {
    const keyCols = key.width || 1;
    const keyRows = key.height || 1;
    const keyWidth = keyCols * cellSize - padding * 2;
    const keyHeight = keyRows * cellSize - padding * 2;
    const x = keyboardX + key.col * cellSize + padding;
    const y = keyboardY + key.row * cellSize + padding;
    // draw key base
    drawKeyBase(x, y, keyWidth, keyHeight, key.letter);
    // get corresponding texture image
    let texture;
    if (key.letter === 'Enter') {
      texture = enterTexture;
    } else {
      const letterIndex = 'PLASTIC'.indexOf(key.letter);
      texture = plasticTextures[letterIndex];
    }
    
    if (texture) {
      let intensity, r, g, b;
      
      if (key.letter === 'Enter') {
        // Enter: calculate tint based on completed rounds
        const completedRounds = updateCompletedRounds(); // Completed rounds
        const maxRounds = 7; // Assume a maximum of 7 rounds
        intensity = Math.min(1, completedRounds / maxRounds);
        
        // #fefff6 → #7ebc88 RGB(126, 188, 136)
        r = Math.floor(254 + (126 - 254) * intensity);
        g = Math.floor(255 + (188 - 255) * intensity);
        b = Math.floor(246 + (136 - 246) * intensity);
      } else {
        // Other keys: calculate tint based on individual letter count
        const count = plasticCounts[key.letter] || 0;
        const maxCount = 8;
        intensity = Math.min(1, count / maxCount);
        
        // #fefff6→ #7ebc88 RGB(126, 188, 136)
        r = Math.floor(254 + (126 - 254) * intensity);
        g = Math.floor(255 + (188 - 255) * intensity);
        b = Math.floor(246 + (136 - 246) * intensity);
      }

      // Apply tint: fixed opacity 40%
      const alpha = 0.4 * 255; // 40% opacity
      tint(r, g, b, alpha);
      image(texture, x, y, keyWidth, keyHeight);
      noTint();
    }
    
    // draw key label
    drawKeyLabel(x, y, keyWidth, keyHeight, key.letter);
  });
}
function drawKeyBase(x, y, w, h, keyLetter) {
  push();
  
  // 1. 基础塑料材质（渐变填充）
  const gradient = drawingContext.createLinearGradient(
    x, y, 
    x, y + h
  );
  
  // 根据按键类型调整颜色
  if (keyLetter === 'Enter') {
    // Enter键的特殊颜色
    const completedRounds = updateCompletedRounds();
    const intensity = Math.min(1, completedRounds / 6);
    // #fefff6 (RGB: 254, 255, 246) → #7ebc88 (RGB: 126, 188, 136)
    
    // 计算渐变颜色
    // 顶部颜色：从#fefff6渐变到#7ebc88
    const topR = Math.floor(254 + (126 - 254) * intensity);
    const topG = Math.floor(255 + (188 - 255) * intensity);
    const topB = Math.floor(246 + (136 - 246) * intensity);
    
    // 中间颜色：从#f6f5dd渐变到#7ebc88
    const midR = Math.floor(246 + (110 - 246) * intensity);
    const midG = Math.floor(245 + (170 - 245) * intensity);
    const midB = Math.floor(221 + (120 - 221) * intensity);
    
    // 底部颜色：从#cad4af渐变到#7ebc88
    const bottomR = Math.floor(202 + (126 - 202) * intensity);
    const bottomG = Math.floor(212 + (188 - 212) * intensity);
    const bottomB = Math.floor(175 + (136 - 175) * intensity);
    
    gradient.addColorStop(0, `rgba(${topR}, ${topG}, ${topB}, 0.8)`);
    gradient.addColorStop(0.7, `rgba(${midR}, ${midG}, ${midB}, 0.8)`);
    gradient.addColorStop(1, `rgba(${bottomR}, ${bottomG}, ${bottomB}, 0.8)`);
  } else {
    // 普通字母键
    gradient.addColorStop(0, 'rgba(254, 255, 246, 0.8)');//#fefff6
    gradient.addColorStop(0.7, 'rgba(246, 245, 221, 0.8)');//#f6f5dd
    gradient.addColorStop(1, 'rgba(202, 212, 175, 0.8)');//#cad4af
  }
  
  drawingContext.fillStyle = gradient;
  noStroke();
  rect(x, y, w, h, 4);
  
  // 2. 3D边框（左上亮，右下暗）
  strokeWeight(1.5);
  
  // 左上高光
  stroke(255, 255, 255, 120);
  line(x, y, x + w - 1, y);
  line(x, y, x, y + h - 1);
  
  // 右下阴影
  stroke(0, 0, 0, 80);
  line(x + w, y, x + w, y + h);
  line(x, y + h, x + w, y + h);
  
  // 3. 内部纹理（模拟塑料质感）
  stroke(255, 255, 255, 30);
  strokeWeight(0.5);
  
  // 水平纹理线
  for (let i = y + 5; i < y + h; i += 4) {
    line(x + 2, i, x + w - 2, i);
  }
  
  // 垂直纹理线（稀疏）
  for (let i = x + 5; i < x + w; i += 8) {
    line(i, y + 2, i, y + h - 2);
  }
  
  // 4. 中心凹陷效果（根据收集状态）
  const completedRounds = updateCompletedRounds();
  let shouldFill = false;
  
  if (keyLetter && keyLetter !== 'Enter') {
    const count = plasticCounts[keyLetter] || 0;
    shouldFill = count > completedRounds;
  }
  
  if (shouldFill) {
    // 当前轮已收集：填充半透明白色
    fill(255, 255, 255, 100);
    noStroke();
    ellipse(x + w/2, y + h/2, w * 0.6, h * 0.6);
    
    // 添加微弱的发光效果
    drawingContext.shadowColor = 'rgba(224, 166, 21, 1)';// #e0a615ff颜色
    drawingContext.shadowBlur = 10;
    ellipse(x + w/2, y + h/2, w * 0.55, h * 0.55);
    drawingContext.shadowBlur = 0;
  } else {
    // 当前轮未收集：只绘制边框
    noFill();
    stroke(0, 0, 0, 20);
    strokeWeight(1);
    ellipse(x + w/2, y + h/2, w * 0.6, h * 0.6);
  }
  
  pop();
}
function drawKeyLabel(x, y, w, h, letter) {
  push();
  noStroke();
  textSize(letter === 'Enter' ? 14 : 20);
  textStyle(BOLD);
  // text shadow
  fill(0, 0, 0, 50);
  text(letter, x + w/2 + 1, y + h/2 + 1);
  // main text
  fill(255);
  text(letter, x + w/2, y + h/2);
  pop();
}
function drawStatusInfo() {
  push();
  
  // draw title
  fill(60);
  noStroke();
  textSize(14);
  textAlign(CENTER, CENTER);
  textStyle(NORMAL);
  // Title position:
  const keyboardX = (width / 8) - ((width / 6) / 2);
  const titleX = keyboardX + (width / 6) / 2;
  text("PLASTIC ACCUMULATION", titleX, 30);
  // Calculate progress information
  const completedRounds = updateCompletedRounds(); // Completed rounds
  const currentRoundCollected = updateCurrentRoundCharacters(); // Letters collected in current round
  const totalRounds = completedRounds + currentRoundCollected / 7;
  const plasticPercent = Math.floor(totalRounds * 100); // Total progress percentage
  
  // Display progress information
  textSize(12);
  let progressText = "";
  if (currentRoundCollected === 0 && completedRounds > 0) {
    // Current round full, show completed rounds
    progressText = `Round ${completedRounds} completed (${plasticPercent}%)`;
  } else if (completedRounds === 0) {
    // Round 0, show letters collected
    progressText = `Collected ${currentRoundCollected}/7 (${plasticPercent}%)`;
  } else {
    // Multiple rounds completed, current round partially collected
    progressText = `Round ${completedRounds + 1}: ${currentRoundCollected}/7 (${plasticPercent}%)`;
  }
  text(progressText, titleX, height - 50);
  
  // draw progress bar
  drawProgressBar(titleX, height - 80, plasticPercent);
  
  pop();
}
function drawProgressBar(x, y, percent) {
  const barWidth = 150;
  const barHeight = 8;
  // background bar
  fill(224, 166, 21, 30);// #e0a615ff color
  noStroke();
  rect(x - barWidth/2, y, barWidth, barHeight, 4);
  // progress bar(0-700%)
  const displayPercent = Math.min(700, percent);
  fill(126, 188, 136, 200); // #7ebc88 color
  rect(x - barWidth/2, y, barWidth * (displayPercent/700), barHeight, 4);
  // marks(every 100%)
  stroke(149, 167, 126);// #95a77e color
  strokeWeight(1);
  for (let i = 1; i <= 6; i++) {
    const markX = x - barWidth/2 + (barWidth * i/7);
    line(markX, y - 2, markX, y + barHeight + 2);
  }
  noStroke();
}

// ========== draw building functions ==========
// initial building
function initPredefinedPositions() {
  // set predefined positions (relative to canvas size)
  predefinedPositions[0].x = 0.7; // width * 0.7
  predefinedPositions[0].y = 0.7; // height * 0.7
}
// updating building system
function updateBuildingSystem() {
  const currentRoundCount = updateCompletedRounds();
  
  // Create new buildings for each added round
  if (currentRoundCount > previousRoundCount) {
    const roundsAdded = currentRoundCount - previousRoundCount;
    
    // initial building (roundIndex=0)
    for (let i = previousRoundCount; i < currentRoundCount; i++) {
      // if i = 0, create building for roundIndex=1
      const buildingIndex = i + 1;
      const newBuilding = createNewBuilding(buildingIndex);
      buildings.push(newBuilding);
      console.log(`Creating building for round ${buildingIndex}, using position index: ${newBuilding.positionIndex}`);
    }
    
    previousRoundCount = currentRoundCount;
  }
  // sort buildings by y position (draw order)
  buildings.sort((a, b) => a.y - b.y);
}
// single building pattern
function singleBuildingPattern(building) {
  const { x, y, initWidth, initHeight, buildingHeight, color, strokeColor } = building;
  const rectY = y - buildingHeight;
  const topEllipseY = rectY;
  
  push();
  
  // ========== 1. 绘制光球 ==========
  const glowBallDiameter = buildingHeight;
  const glowBallCenterY = y - buildingHeight / 2; 
  
  const gradient = drawingContext.createRadialGradient(
    x, glowBallCenterY, 0,
    x, glowBallCenterY, glowBallDiameter/2,
  );
  
  const centerColor = `rgba(202, 212, 175, 1)`;
  const edgeColor = `rgba(202, 212, 175, 0)`;
  gradient.addColorStop(0, centerColor);
  gradient.addColorStop(1, edgeColor);
  drawingContext.fillStyle = gradient;
  noStroke();
  ellipse(x, glowBallCenterY, glowBallDiameter, glowBallDiameter);
  
  // ========== 2. 绘制追踪三角形（在光球上方，建筑下方） ==========
  drawMonitorEffect(building);
  
  // ========== 3. 绘制建筑 ==========
  // buttom ellipse
  stroke(strokeColor);
  strokeWeight(0.5);
  fill(color);
  ellipse(x, y, initWidth, initHeight);
  
  // middle rect
  noStroke();
  fill(red(color), green(color), blue(color), alpha(color) * 0.8);
  beginShape();
  vertex(x - initWidth/2, y);
  vertex(x + initWidth/2, y);
  vertex(x + initWidth/2, rectY);
  vertex(x - initWidth/2, rectY);
  endShape(CLOSE);
  
  // upper ellipse
  stroke(strokeColor);
  strokeWeight(0.5);
  fill(color);
  ellipse(x, topEllipseY, initWidth, initHeight);
  
  // lines
  stroke(strokeColor);
  strokeWeight(0.3);
  line(x - initWidth/2, y, x - initWidth/2, rectY);
  line(x + initWidth/2, y, x + initWidth/2, rectY);

  pop();
}
// create new building
function createNewBuilding(roundIndex) {
  // set size based on round index
  const initScale = 1.0 * Math.pow(1.05, roundIndex);
  const initWidth = width * 0.1 * initScale;
  const initHeight = initWidth * 0.2;
  const buildingHeight = height * 0.1 * initScale;
  // set color randomly
  let r, g, b;
  if (roundIndex === 0) {
    // initial building: fixed color #7ebc88
    r = 126; // red component of #7ebc88
    g = 188; // green component of #7ebc88
    b = 136; // blue component of #7ebc88
  } else {
    // other buildings: random color along path from #f6f5dd to #7ebc88
    const randomFactor = random(0, 1);
    r = Math.floor(246 + (126 - 246) * randomFactor);
    g = Math.floor(245 + (188 - 245) * randomFactor);
    b = Math.floor(221 + (136 - 221) * randomFactor);
  }
  // use predefined positions (loop if roundIndex exceeds array length)
  const positionIndex = roundIndex % predefinedPositions.length;
  const pos = predefinedPositions[positionIndex];
  // calculate actual position (based on canvas size)
  const x = pos.x * width;
  const y = pos.y * height;

  console.log(`Creating building: round ${roundIndex}, position index ${positionIndex}, color: ${roundIndex === 0 ? "fixed #7ebc88" : "random"}`);
  
  return {
    x: x,
    y: y,
    initWidth: initWidth,
    initHeight: initHeight,
    buildingHeight: buildingHeight,
    color: color(r, g, b, 150),
    strokeColor: color(0),
    roundIndex: roundIndex,
    positionIndex: positionIndex,
    drawOrder: y
  };
}
// draw all buildings
function drawAllBuildings() {
  // update building system
  updateBuildingSystem();
  // draw buildings in order (smaller y values drawn later, bigger y values on top)
  buildings.forEach(building => {
    singleBuildingPattern(building);
  });
}

// ========== character functions ==========
// initialize character
function initCharacter() {
  // set initial character position
  character.initX = width * 0.4;
  character.initY = height * 0.75;
  // let current position equal to initial position
  character.x = character.initX;
  character.y = character.initY;
  // set dimensions based on canvas size
  const minDimension = min(width, height);
  character.headDiameter = max(minDimension * 0.02, 10); // avoid too small
  character.bodyHeight = character.headDiameter * 2;
  // initialize move-speed
  character.moveSpeed = 1.5;
  // initialize color
  CharacterColors.currentColor = { 
    r: CharacterColors.startColor.r, 
    g: CharacterColors.startColor.g, 
    b: CharacterColors.startColor.b 
  };
  
  // 初始化WASD提示相关变量
  showWASDHint = true;
  wasdHintAlpha = 0;
  wasdHintPhase = 0;
  
  console.log("successfully initialized character:");
}
// update character color based on current letter
function updateCharacterColor() {
  // calculate progress from startColor to endColor
  const progress = (currentLetter - 1) / 5; 
  // calculate r, g, b values
  const r = Math.floor(
    CharacterColors.startColor.r + 
    (CharacterColors.endColor.r - CharacterColors.startColor.r) * progress
  );
  const g = Math.floor(
    CharacterColors.startColor.g + 
    (CharacterColors.endColor.g - CharacterColors.startColor.g) * progress
  );
  const b = Math.floor(
    CharacterColors.startColor.b + 
    (CharacterColors.endColor.b - CharacterColors.startColor.b) * progress
  );
  // update current color
  CharacterColors.currentColor = { r, g, b };
  // debug output (optional)
  console.log(`Letter ${currentLetter} - Character color: RGB(${r}, ${g}, ${b})`);
}
// update body dimensions based on current letter
function updateBodyDimensions() {
  // get current letter number
  const letterNum = currentLetter;
  const initSize = max(character.headDiameter * 1.5, 15); // avoid too small
  // update topBase and bottomBase based on letter number
  let topBase, bottomBase;
  switch(letterNum) {
    case 1:
      topBase = 0;
      bottomBase = initSize;
      break;
    case 2:
      topBase = initSize * 0.3;
      bottomBase = initSize * 0.7;
      break;
    case 3:
    case 4:
      topBase = initSize * 0.5;
      bottomBase = initSize * 0.5;
      break;
    case 5:
      topBase = initSize * 0.7;
      bottomBase = initSize * 0.3;
      break;
    case 6:
      topBase = initSize;
      bottomBase = 0;
      break;
    default:
      topBase = bottomBase = initSize * 0.5;
  }
  
  character.topBase = topBase;
  character.bottomBase = bottomBase;
  
  console.log(`letter${letterNum} - initial size: ${initSize.toFixed(1)}`);
  console.log(`bodyTopBase=${topBase.toFixed(1)}, bodyBottomBase=${bottomBase.toFixed(1)}`);
}
// draw character
function drawCharacter() {
  push();
  drawBody();
  drawHead();
  pop();
}
// draw body
function drawBody() {
  const { x, y, bodyHeight, topBase, bottomBase } = character;
  // bottom middle position:(x,y), top middle position:(x,y - bodyHeight)
  const bodyTopY = y - bodyHeight;
  push();
  const { r, g, b } = CharacterColors.currentColor;
  fill(r, g, b, 150); // #e0a615ff color
  stroke(0);
  strokeWeight(0.5);
  // draw body in different conditions
  beginShape();
  if (topBase === 0) {
    // triangle (top base=0)
    vertex(x, bodyTopY); // top vertex
    vertex(x - bottomBase/2, y); // bottom left
    vertex(x + bottomBase/2, y); // bottom right
  } else if (bottomBase === 0) {
    // inverted triangle (bottom base=0)
    vertex(x - topBase/2, bodyTopY); // top left
    vertex(x + topBase/2, bodyTopY); // top right
    vertex(x, y); // bottom vertex
  } else {
    // normal trapezoid
    vertex(x - topBase/2, bodyTopY); // top left
    vertex(x + topBase/2, bodyTopY); // top right
    vertex(x + bottomBase/2, y); // bottom right
    vertex(x - bottomBase/2, y); // bottom left
  }
  endShape(CLOSE);
  pop();
}
// draw head
function drawHead() {
  const { x, y, headDiameter, bodyHeight } = character;
  const headCenterY = y - bodyHeight - headDiameter / 2;
  // draw head
  const { r, g, b } = CharacterColors.currentColor;
  fill(r, g, b, 150); // #e0a615ff color
  stroke(0);
  strokeWeight(0.5);
  ellipse(x, headCenterY, headDiameter, headDiameter);
}
// ========== 按键释放事件函数 ==========
function keyReleased() {
  // 这里可以留空，或者只用于其他非移动功能
  // 移动按键的状态检测已转移到 keyIsDown()
}
// ========== 更新角色位置函数 ==========
function updateCharacterPosition() {
  // 使用 keyIsDown() 直接检测当前按键状态，避免事件处理问题
  const isUpPressed = keyIsDown(87);    // W key code: 87
  const isDownPressed = keyIsDown(83);  // S key code: 83
  const isLeftPressed = keyIsDown(65);  // A key code: 65
  const isRightPressed = keyIsDown(68); // D key code: 68
  
  // 如果检测到WASD键被按下，隐藏WASD提示
  if ((isUpPressed || isDownPressed || isLeftPressed || isRightPressed) && showWASDHint) {
    showWASDHint = false;
  }
  
  // 计算方向
  let dx = 0;
  let dy = 0;
  
  // 更新位置基于当前按键状态
  if (isUpPressed) dy -= character.moveSpeed;    // 上
  if (isDownPressed) dy += character.moveSpeed;  // 下
  if (isLeftPressed) dx -= character.moveSpeed;  // 左
  if (isRightPressed) dx += character.moveSpeed; // 右
  
  // 保持对角线移动速度一致
  if (dx !== 0 && dy !== 0) {
    dx *= 1/Math.sqrt(2); // 1/√2
    dy *= 1/Math.sqrt(2);
  }
  
  // 更新位置
  if (dx !== 0 || dy !== 0) {
    character.x += dx;
    character.y += dy;
    // 限制位置
    constrainCharacterPosition();
  }
}
// constrain character position
function constrainCharacterPosition() {
  const { x, y, bodyHeight } = character;
  // horizontal area range
  const minX = width * 0.25;
  const maxX = width * 0.6;
  // vertical area range
  const minY = height * 0.5; 
  const maxY = height * 0.9;
  // constrain position
  character.x = constrain(x, minX, maxX);
  character.y = constrain(y, minY, maxY);
}

// ========== WASD hint functions ==========
function drawWASDHint() {
  if (!showWASDHint) return;
  
  // ========== 基于画布大小直接计算所有尺寸 ==========
  // 1. 计算键盘的基本参数（与drawKeyboard中相同的计算方式）
  const keyboardWidth = width / 6;
  const keyboardHeight = height / 2;
  const cellSize = keyboardWidth / 3; // 普通键的理论尺寸
  const keyboardX = (width / 8) - (keyboardWidth / 2);
  const keyboardY = (height * 0.4) - (keyboardHeight / 2);
  const padding = 4; // 键盘内键间隔
  
  // 2. 计算Enter键的位置和尺寸
  // Enter键在键盘布局中：col=1, row=2, width=2, height=1
  const enterKeyCols = 2; // Enter键占用2列
  const enterKeyRows = 1; // Enter键占用1行
  const enterKeyWidth = enterKeyCols * cellSize - padding * 2;
  const enterKeyHeight = enterKeyRows * cellSize - padding * 2;
  const enterKeyX = keyboardX + 1 * cellSize + padding;
  const enterKeyY = keyboardY + 2 * cellSize + padding;
  
  // Enter键的右边界和底部
  const enterKeyRight = enterKeyX + enterKeyWidth;
  const enterKeyBottom = enterKeyY + enterKeyHeight;
  
  // 3. 计算小键盘尺寸
  const smallKeySize = cellSize * 0.25; // 边长为普通键的1/4
  const smallKeySpacing = padding * 0.25; // 间隔为键盘间隔的1/4
  
  // 4. 计算小键盘位置
  // A键左侧边界与Enter键右边界间隔为键盘内部每个键的间隔大小（即padding）
  const aKeyLeft = enterKeyRight + padding;
  // A键底部与键盘底部enter键底部齐平
  const aKeyBottom = enterKeyBottom;
  const aKeyY = aKeyBottom - smallKeySize; // A键的y坐标（顶部坐标）
  
  // 5. 计算每个键的位置
  const keyPositions = {
    'A': { x: aKeyLeft, y: aKeyY },
    'S': { x: aKeyLeft + smallKeySize + smallKeySpacing, y: aKeyY },
    'D': { x: aKeyLeft + (smallKeySize + smallKeySpacing) * 2, y: aKeyY },
    'W': { 
      x: aKeyLeft + smallKeySize + smallKeySpacing, 
      y: aKeyY - smallKeySize - smallKeySpacing 
    }
  };
  
  // 6. 定义每个键的颜色（全部使用#cad4af）
  const keyColors = {
    'W': [202, 212, 175], // #cad4af
    'A': [202, 212, 175], // #cad4af
    'S': [202, 212, 175], // #cad4af
    'D': [202, 212, 175]  // #cad4af
  };
  
  // 7. 绘制所有键
  push();
  
  const currentAlpha = wasdHintAlpha;
  
  // 绘制四个键
  for (const [letter, pos] of Object.entries(keyPositions)) {
    drawSmallKey(
      pos.x, pos.y, 
      smallKeySize, smallKeySize,
      letter,
      keyColors[letter],
      currentAlpha
    );
  }
  
  pop();
}

function drawSmallKey(x, y, w, h, letter, colorArray, alphaValue) {
  push();
  
  // 纯色填充（#cad4af）
  const [r, g, b] = colorArray;
  noStroke();
  fill(r, g, b, alphaValue);
  rect(x, y, w, h, 2); // 小圆角
  
  // 字母（#fefff6）
  textSize(w * 0.4);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  fill(254, 255, 246, alphaValue); // #fefff6
  text(letter, x + w/2, y + h/2);
  
  pop();
}

// ========== 阴影效果函数 ==========
function drawShadowEffect() {
  // 获取小人底边中点坐标
  const characterX = character.x;
  const characterY = character.y;
  
  // 获取画布边界
  const canvasLeft = 0;
  const canvasRight = width;
  const canvasTop = 0;
  const canvasBottom = height;
  
  // 我们需要为每个建筑计算阴影，所以需要遍历所有建筑
  for (let i = 0; i < buildings.length; i++) {
    const building = buildings[i];
    const { x: buildingX, y: buildingY, initWidth, initHeight } = building;
    
    // 获取建筑底部椭圆的左右端点
    const leftPointX = buildingX - initWidth/2;
    const leftPointY = buildingY;
    const rightPointX = buildingX + initWidth/2;
    const rightPointY = buildingY;
    
    // 修改射线方向：从建筑端点出发，经过小人底边中点，继续延伸
    const ray1 = calculateRayIntersection(
      leftPointX, leftPointY,  // 起点：建筑左端点
      characterX, characterY,  // 经过点：小人底边中点
      canvasLeft, canvasRight, canvasTop, canvasBottom
    );
    
    const ray2 = calculateRayIntersection(
      rightPointX, rightPointY,  // 起点：建筑右端点
      characterX, characterY,    // 经过点：小人底边中点
      canvasLeft, canvasRight, canvasTop, canvasBottom
    );
    
    if (ray1.intersection && ray2.intersection) {
      // 获取两个交点
      const point1 = ray1.intersection;
      const point2 = ray2.intersection;
      
      // 绘制阴影三角形
      drawShadowTriangle(characterX, characterY, point1, point2, building);
    }
  }
}

// 计算射线与画布边界的交点
function calculateRayIntersection(startX, startY, throughX, throughY, left, right, top, bottom) {
  // 射线方向向量：从起点（建筑端点）指向经过点（小人底边中点）
  // 然后继续沿同一方向延伸
  const dx = throughX - startX;
  const dy = throughY - startY;
  
  // 如果dx和dy都为0，说明起点和经过点重合，无法确定方向
  if (dx === 0 && dy === 0) return { intersection: null, t: Infinity };
  
  // 计算与四条边界的交点参数t（t > 0 表示沿方向向量延伸）
  let tValues = [];
  let intersectionPoints = [];
  
  // 与左边界相交 (x = left)
  if (dx !== 0) {
    const t = (left - startX) / dx;
    if (t > 0) {
      const y = startY + t * dy;
      if (y >= top && y <= bottom) {
        tValues.push(t);
        intersectionPoints.push({ x: left, y: y, edge: 'left' });
      }
    }
  }
  
  // 与右边界相交 (x = right)
  if (dx !== 0) {
    const t = (right - startX) / dx;
    if (t > 0) {
      const y = startY + t * dy;
      if (y >= top && y <= bottom) {
        tValues.push(t);
        intersectionPoints.push({ x: right, y: y, edge: 'right' });
      }
    }
  }
  
  // 与上边界相交 (y = top)
  if (dy !== 0) {
    const t = (top - startY) / dy;
    if (t > 0) {
      const x = startX + t * dx;
      if (x >= left && x <= right) {
        tValues.push(t);
        intersectionPoints.push({ x: x, y: top, edge: 'top' });
      }
    }
  }
  
  // 与下边界相交 (y = bottom)
  if (dy !== 0) {
    const t = (bottom - startY) / dy;
    if (t > 0) {
      const x = startX + t * dx;
      if (x >= left && x <= right) {
        tValues.push(t);
        intersectionPoints.push({ x: x, y: bottom, edge: 'bottom' });
      }
    }
  }
  
  // 找到最小的正t值（最近的交点）
  if (tValues.length > 0) {
    let minT = Infinity;
    let minIndex = -1;
    
    for (let i = 0; i < tValues.length; i++) {
      if (tValues[i] < minT && tValues[i] > 0.1) { // t > 0.1 确保不会选择离起点太近的交点
        minT = tValues[i];
        minIndex = i;
      }
    }
    
    if (minIndex !== -1) {
      return {
        intersection: intersectionPoints[minIndex],
        t: minT
      };
    }
  }
  
  return { intersection: null, t: Infinity };
}

// 绘制阴影三角形（或多边形）
function drawShadowTriangle(centerX, centerY, point1, point2, building) {
  push();
  noStroke();
  
  // 检查两个交点是否在同一边上
  const sameEdge = point1.edge === point2.edge;
  
  // 收集所有顶点
  let allVertices = [];  // 将变量名从vertices改为allVertices
  
  if (sameEdge) {
    // 如果两个交点在同一个边上，直接连接三个点形成三角形
    allVertices = [
      { x: centerX, y: centerY },  // 顶点：小人底边中点
      { x: point1.x, y: point1.y }, // 交点1
      { x: point2.x, y: point2.y }  // 交点2
    ];
  } else {
    // 如果两个交点在不同的边上，需要添加画布角点
    // 找到距离两个交点最近的画布角点
    const corners = [
      { x: 0, y: 0 },           // 左上
      { x: width, y: 0 },       // 右上
      { x: width, y: height },  // 右下
      { x: 0, y: height }       // 左下
    ];
    
    // 计算每个角点到两个交点的距离之和
    let minDistance = Infinity;
    let nearestCorner = corners[0];
    
    for (const corner of corners) {
      const dist1 = dist(corner.x, corner.y, point1.x, point1.y);
      const dist2 = dist(corner.x, corner.y, point2.x, point2.y);
      const totalDist = dist1 + dist2;
      
      if (totalDist < minDistance) {
        minDistance = totalDist;
        nearestCorner = corner;
      }
    }
    
    // 确定顶点的顺序（顺时针或逆时针）
    // 我们按照顺时针顺序：中心点 -> 交点1 -> 角点 -> 交点2
    allVertices = [
      { x: centerX, y: centerY },  // 顶点：小人底边中点
      { x: point1.x, y: point1.y }, // 交点1
      { x: nearestCorner.x, y: nearestCorner.y }, // 最近的画布角点
      { x: point2.x, y: point2.y }  // 交点2
    ];
  }
  
  // 计算所有顶点到中心点的距离，找到最远距离
  let maxDist = 0;
  for (const v of allVertices) {  // 改为使用v而不是vertex
    const d = dist(centerX, centerY, v.x, v.y);
    if (d > maxDist) maxDist = d;
  }
  
  // 创建径向渐变
  const gradient = drawingContext.createRadialGradient(
    centerX, centerY, 0,           // 内圆圆心和半径
    centerX, centerY, maxDist      // 外圆圆心和半径
  );
  
  // 顶点颜色：#f6f5dd，透明度0
  const vertexColor = `rgba(246, 245, 221, 0)`;
  // 边缘颜色：#e0a615，透明度30%
  const edgeColor = `rgba(224, 166, 21, 0.3)`;
  
  gradient.addColorStop(0, vertexColor);
  gradient.addColorStop(1, edgeColor);
  
  // 应用渐变
  drawingContext.fillStyle = gradient;
  
  // 绘制多边形
  beginShape();
  for (const v of allVertices) {  // 改为使用v而不是vertex
    vertex(v.x, v.y);
  }
  endShape(CLOSE);
  
  pop();
}

// ========== 追踪三角形函数 ==========
function drawMonitorEffect(building) {
  // 获取建筑信息
  const { x: buildingX, y: buildingY, initWidth, initHeight, color: buildingColor } = building;
  
  // 获取小人底边中点坐标
  const characterX = character.x;
  const characterY = character.y;
  
  // 使用椭圆左右端点作为近似切点（简化版本）
  const leftPointX = buildingX - initWidth/2;
  const leftPointY = buildingY;
  const rightPointX = buildingX + initWidth/2;
  const rightPointY = buildingY;
  
  // 绘制三角形
  push();
  noStroke();
  
  // 计算径向渐变的参数
  const centerX = characterX;
  const centerY = characterY;
  
  // 计算到两个端点的距离
  const distLeft = dist(centerX, centerY, leftPointX, leftPointY);
  const distRight = dist(centerX, centerY, rightPointX, rightPointY);
  const maxDist = max(distLeft, distRight);
  
  // 创建径向渐变
  const gradient = drawingContext.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, maxDist
  );
  
  // 获取建筑底部椭圆的颜色和透明度
  const buildingAlpha = alpha(buildingColor);
  const buildingRed = red(buildingColor);
  const buildingGreen = green(buildingColor);
  const buildingBlue = blue(buildingColor);
  
  // 顶点颜色修改为：#f6f5dd，透明度50%
  const vertexColor = `rgba(246, 245, 221, 0.5)`;
  // 底边颜色：建筑底部椭圆的颜色和透明度
  const baseColor = `rgba(${buildingRed}, ${buildingGreen}, ${buildingBlue}, ${buildingAlpha})`;
  
  // 设置渐变颜色
  gradient.addColorStop(0, vertexColor);
  gradient.addColorStop(1, baseColor);
  
  // 应用渐变
  drawingContext.fillStyle = gradient;
  
  // 绘制三角形
  beginShape();
  vertex(characterX, characterY);    // 顶点：小人底边中点
  vertex(leftPointX, leftPointY);    // 左端点
  vertex(rightPointX, rightPointY);  // 右端点
  endShape(CLOSE);
  
  pop();
}

// ========== 覆盖矩形函数 ==========
function drawCoverRect() {
  push();
  
  // 计算键盘的基本参数（与drawKeyboard中相同的计算方式）
  const keyboardWidth = width / 6;
  const keyboardHeight = height / 2;
  const cellSize = keyboardWidth / 3;
  const keyboardX = (width / 8) - (keyboardWidth / 2);
  const keyboardY = (height * 0.4) - (keyboardHeight / 2);
  const padding = 4; // 键盘内键间隔
  
  // 矩形宽度：从画布最左侧到键盘右侧加上三个键盘内部键的间隔
  const rectRight = keyboardX + keyboardWidth + 3 * padding;
  
  // 设置矩形样式
  noStroke();
  fill(246, 245, 221); // 与背景相同的颜色 #f6f5dd
  
  // 绘制矩形：覆盖从画布左侧到键盘右侧+padding的区域，高度为整个画布
  rect(0, 0, rectRight, height);
  
  pop();
}

// ========== resize function ==========
function windowResized() {
  // resize Canvas
  resizeCanvas(windowWidth, windowHeight * 0.5);
}
// ========== 重置函数 ==========
function resetAllData() {
  // 重置所有用户数据
  currentLetter = 1;
  plasticCounts = {P:0, L:0, A:0, S:0, T:0, I:0, C:0};
  userTendency = 0;
  earlyChoices = [null, null, null];
  buildings = [];
  previousRoundCount = 0;
  
  // 重置角色位置
  character.x = character.initX || 0;
  character.y = character.initY || 0;
  
  // 重置WASD提示
  showWASDHint = true;
  wasdHintAlpha = 0;
  wasdHintPhase = 0;
  
  // 停止所有音频
  if (bgMusic && bgMusic.isPlaying()) bgMusic.stop();
  if (bgNature && bgNature.isPlaying()) bgNature.stop();
  if (bgMachine && bgMachine.isPlaying()) bgMachine.stop();
  isAudioPlaying = false;
  
  console.log("所有数据已重置，准备重新测试。");
}
// ========== 重新测试函数 ==========
function retakeTest() {
  console.log("Retaking the test...");
  
  // 重置所有数据
  resetAllData();
  
  // 切换回开始界面
  select('#end-screen').addClass('hidden');
  select('#start-screen').removeClass('hidden');
  
  // 重置表单
  select('#first-name').value('');
  select('#last-name').value('');
  select('#gender').value('');
}
