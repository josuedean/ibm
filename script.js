/***************************************************
 * Enhanced Windows-style CLI in the Browser
 ****************************************************/

let fileSystem = null; // We’ll build this after fetching the JSON
let currentDirectory = null;

// For quick references to certain files if needed:
const fileIndex = {};

// Theme handling: We keep track of the current mode & color
let currentMode = "dark"; // or "light"
let currentColor = "green"; // or "white", "black", "blue"

// Command history storage
let commandHistory = [];
let historyIndex = -1;

/**
 * Build a mock file system structure using the JSON data
 * so that the textual content is not in the code.
 *  We have directories, each with:
 *    { name, type:'dir', children: [sub-items], hidden?:bool, locked?:bool, ... }
 *  For files: 
 *    { name, type:'file', content:'...', hidden?:bool, locked?:bool, attributeFlags?:{}}
 */
function buildFileSystem(contents) {
  // Example structure:
  return {
    name: "C:\\",
    type: "dir",
    attributeFlags: {},
    children: [
      {
        name: "README.md",
        type: "file",
        content: contents.readmeMd,
        attributeFlags: { readOnly: false, hidden: false },
      },
      {
        name: "Atrium",
        type: "dir",
        attributeFlags: {},
        children: [
          {
            name: "Hint.txt",
            type: "file",
            content: contents.atriumHint,
            attributeFlags: { hidden: false, readOnly: false }
          },
          {
            name: "FakeTrap.txt",
            type: "file",
            content: contents.fakeTrap,
            attributeFlags: { hidden: false, readOnly: false }
          },
          {
            name: "Corridor",
            type: "dir",
            attributeFlags: { hidden: true },
            children: [
              {
                name: "CorridorClue.txt",
                type: "file",
                content: contents.corridorClue,
                attributeFlags: { hidden: false, readOnly: false }
              },
              {
                name: "SecretRoom",
                type: "dir",
                attributeFlags: { hidden: false },
                children: [
                  {
                    name: "HiddenNote.txt",
                    type: "file",
                    content: contents.secretRoomHiddenNote,
                    attributeFlags: { hidden: false, readOnly: false }
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        name: "Vault",
        type: "dir",
        attributeFlags: {},
        children: [
          {
            name: "LockedDoor.txt",
            type: "file",
            content: contents.vaultLocked,
            locked: true,
            attributeFlags: { hidden: false, readOnly: true }
          },
          {
            name: "SecretArtifact.exe",
            type: "file",
            content: contents.secretArtifactExe,
            attributeFlags: { hidden: false, readOnly: false }
          },
          {
            name: "FalseLead.txt",
            type: "file",
            content: contents.falseLeadClue,
            attributeFlags: { hidden: false, readOnly: false }
          },
          {
            name: "UnlockedDoor.txt",
            type: "file",
            content: contents.vaultUnlocked,
            attributeFlags: { hidden: true, readOnly: false }
          },
          {
            name: "Treasure.txt",
            type: "file",
            // This is the obfuscated content
            content: contents.treasureTxtObfuscated,
            attributeFlags: { hidden: true, readOnly: false }
          }
        ]
      }
    ]
  };
}


// DOM references
const outputEl = document.getElementById('output');
const inputEl = document.getElementById('command-input');
const promptEl = document.getElementById('prompt');

// ----- Utility Functions -----
function print(text) {
  const line = document.createElement("div");
  line.textContent = text;
  outputEl.appendChild(line);

  // Ensure the terminal always scrolls to the bottom
  const terminalEl = document.getElementById("terminal");
  terminalEl.scrollTop = terminalEl.scrollHeight;
}


function getCurrentPathString() {
  return promptEl.textContent.replace('>', '');
}

/**
 * Recursively search within 'dir' for an entry matching 'name' (case-insensitive)
 * Return the entry or null
 */
function findEntryInDir(dir, name) {
  if (!dir || !dir.children) {
    console.warn("findEntryInDir: Directory is null or has no children.");
    return null;
  }
  return dir.children.find((child) => child.name.toLowerCase() === name.toLowerCase()) || null;
}

/**
 * parse command line input
 */
function parseInput(input) {
  const parts = input.trim().split(' ');
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);
  return { cmd, args };
}

/**
 * "dir" command
 *  usage: dir [options]
 *  - /A or /A:H or /ah to show hidden
 */
function handleDir(args) {
  const showHidden = args.some(a => a.toLowerCase().includes('a'));
  if (!currentDirectory.children) {
    print("No items.");
    return;
  }
  let items = currentDirectory.children.filter(child => {
    if (showHidden) return true;
    return !child.attributeFlags?.hidden;
  });

  // Print directories first, then files
  const dirs = items.filter(i => i.type === 'dir');
  const files = items.filter(i => i.type === 'file');

  dirs.forEach(d => {
    print("<DIR>          " + d.name);
  });
  files.forEach(f => {
    print("               " + f.name);
  });
}

/**
 * "cd" command
 *  usage: cd <foldername> or cd .. to go up (we might limit or do partial)
 */
function handleCd(args) {
  if (args.length === 0) {
    // cd with no arg -> root
    currentDirectory = fileSystem;
    promptEl.textContent = "C:\\>";
    return;
  }
  const target = args[0];
  if (target === "..") {
    // If we want to implement going up:
    //   you'd store a "parent" reference. Let's do a quick check if we are at root or not:
    if (currentDirectory === fileSystem) {
      print("Already at root.");
    } else {
      // You would do: currentDirectory = currentDirectory.parent
      // For simplicity, let's just say not implemented.
      print("Going up is not implemented in this demo!");
    }
    return;
  }

  // find a subdirectory with the given name
  const found = findEntryInDir(currentDirectory, target);
  if (!found) {
    print("Directory not found: " + target);
    return;
  }
  if (found.type !== 'dir') {
    print(found.name + " is not a directory.");
    return;
  }

  // move in
  currentDirectory = found;
  const currentPath = getCurrentPathString().replace(/\\>$/, '');
  promptEl.textContent = currentPath + "\\" + found.name + ">";
}

/**
 * "type" command
 *  usage: type <filename>
 */
function handleType(args) {
  if (!args.length) {
    print("Usage: type <filename>");
    return;
  }
  const filename = args[0];
  const found = findEntryInDir(currentDirectory, filename);
  if (!found) {
    print("File not found: " + filename);
    return;
  }
  if (found.type !== 'file') {
    print(found.name + " is not a file.");
    return;
  }
  // locked?
  if (found.locked) {
    print("File is locked. Access denied.");
    return;
  }
  // readOnly doesn't prevent reading in Windows, just prevents writing, so we allow it.

  let content = found.content;
  // If it's the treasure, decode from base64
  if (found.name.toLowerCase() === "treasure.txt") {
    // decode Base64
    try {
      const decoded = atob(content);
      content = decoded;
    } catch(e) {
      // if not valid base64, do nothing
    }
  }

  print(content);
}

/**
 * "rename" command
 *  usage: rename <oldName> <newName>
 */
function handleRename(args) {
  if (args.length < 2) {
    print("Usage: rename <oldName> <newName>");
    return;
  }
  const [oldName, newName] = args;
  const found = findEntryInDir(currentDirectory, oldName);
  if (!found) {
    print(`File not found: ${oldName}`);
    return;
  }
  found.name = newName;

  // If it was locked, let's unlock it upon rename
  if (found.locked) {
    found.locked = false;
    print("File unlocked by rename!");
  }

  print(`Renamed ${oldName} to ${newName}`);
}

/**
 * Additional Command: "tree"
 *  Recursively shows directory structure
 */
function handleTree(dir = currentDirectory, prefix = "") {
  print(prefix + dir.name);
  if (dir.children) {
    for (const child of dir.children) {
      if (child.type === 'dir') {
        handleTree(child, prefix + "   ");
      } else {
        print(prefix + "   " + child.name);
      }
    }
  }
}

/**
 * Additional Command: "findstr"
 *  usage: findstr <text> <files...>
 */
function handleFindstr(args) {
  if (args.length < 2) {
    print("Usage: findstr <text> <filename> [filename2] ...");
    return;
  }
  const searchText = args[0].toLowerCase();
  const files = args.slice(1);

  files.forEach(fname => {
    const found = findEntryInDir(currentDirectory, fname);
    if (!found || found.type !== 'file') {
      print(`Cannot open file: ${fname}`);
    } else {
      // Check content
      let c = found.content.toLowerCase();
      if (c.includes(searchText)) {
        print(`${fname}: [contains "${args[0]}"]`);
      } else {
        print(`${fname}: [no match]`);
      }
    }
  });
}

/**
 * Additional Command: "attrib"
 *  usage: attrib <filename> to show attributes
 *         attrib +/-h +/-r <filename> to set/unset hidden or readOnly
 */
function handleAttrib(args) {
  if (!args.length) {
    print("Usage: attrib [options] <filename>");
    return;
  }

  // If the last arg is a filename, parse the earlier ones as flags
  const filename = args[args.length - 1];
  const found = findEntryInDir(currentDirectory, filename);
  if (!found) {
    print(`File not found: ${filename}`);
    return;
  }

  // Gather flags from everything except the last
  const flags = args.slice(0, args.length - 1);

  if (!flags.length) {
    // just show attributes
    showAttributes(found);
  } else {
    // set/unset attributes
    flags.forEach(flag => {
      if (flag === '+h') found.attributeFlags.hidden = true;
      if (flag === '-h') found.attributeFlags.hidden = false;
      if (flag === '+r') found.attributeFlags.readOnly = true;
      if (flag === '-r') found.attributeFlags.readOnly = false;
    });
    showAttributes(found);
  }
}

function showAttributes(fileOrDir) {
  let flags = "";
  if (fileOrDir.attributeFlags.hidden) flags += "H ";
  if (fileOrDir.attributeFlags.readOnly) flags += "R ";
  print(`${fileOrDir.name} [${flags.trim() || "none"}]`);
}

/**
 * Additional Command: "copy" (just duplicating the file in the same dir for demo)
 *  usage: copy <source> <dest>
 */
function handleCopy(args) {
  if (args.length < 2) {
    print("Usage: copy <source> <destination>");
    return;
  }
  const [src, dest] = args;
  const found = findEntryInDir(currentDirectory, src);
  if (!found) {
    print("File not found: " + src);
    return;
  }
  if (found.type !== 'file') {
    print("Source is not a file.");
    return;
  }
  // create a new file with the same content
  const copyFile = JSON.parse(JSON.stringify(found));
  copyFile.name = dest;
  currentDirectory.children.push(copyFile);
  print(`Copied ${src} to ${dest}`);
}

/**
 * Additional Command: "move" (same logic as copy, but remove original)
 *  usage: move <source> <destination>
 */
function handleMove(args) {
  if (args.length < 2) {
    print("Usage: move <source> <destination>");
    return;
  }
  const [src, dest] = args;
  const found = findEntryInDir(currentDirectory, src);
  if (!found) {
    print("File not found: " + src);
    return;
  }
  if (found.type !== 'file') {
    print("Source is not a file.");
    return;
  }
  // create a new file with same content
  const copyFile = JSON.parse(JSON.stringify(found));
  copyFile.name = dest;
  currentDirectory.children.push(copyFile);

  // remove original
  currentDirectory.children = currentDirectory.children.filter(c => c !== found);
  print(`Moved ${src} to ${dest}`);
}

/**
 * Additional Command: "del"
 *  usage: del <filename>
 */
function handleDel(args) {
  console.log("handleDel called with args:", args); // Debugging line

  if (!args.length) {
    print("Usage: del <filename>");
    inputEl.value = ""; // Ensure input clears
    return;
  }

  // Ensure `currentDirectory` is valid before using it
  if (!currentDirectory || !currentDirectory.children) {
    print("Error: Current directory is undefined or invalid.");
    inputEl.value = ""; // Ensure input clears
    return;
  }

  const filename = args[0];
  const found = findEntryInDir(currentDirectory, filename);

  if (!found) {
    print(`File not found: ${filename}`);
  } else if (found.type !== "file") {
    print(`${filename} is not a file and cannot be deleted.`);
  } else {
    // Remove file from the directory
    currentDirectory.children = currentDirectory.children.filter(c => c.name !== filename);
    print(`Deleted ${filename}`);
  }

  inputEl.value = ""; // Ensure input clears
}


/**
 * Additional Command: "echo" 
 */
function handleEcho(args) {
  // Just print whatever arguments they pass
  const message = args.join(" ");
  print(message);
}

/**
 * Additional Command: "title"
 */
function handleTitle(args) {
  // We won't actually change the browser tab, but let's pretend
  if (!args.length) {
    print("Usage: title <text>");
    return;
  }
  const titleText = args.join(" ");
  document.getElementById('window-title').textContent = newTitle;
  print(`Window title set to "${titleText}" `);
}

/**
 * Additional Command: "color"
 *  We also have actual UI buttons for color changes, 
 *  but let's parse "color XY" or something. 
 *  We'll do something minimal here:
 */
function handleColor(args) {
  if (!args.length) {
    print("Usage: color <code>  (e.g. 0A for green on black, etc.)");
    return;
  }
  const code = args[0].toUpperCase();
  let textColor = "";
  let backgroundColor = "";

  // Interpret the color codes
  switch (code) {
    case "0A": // Green text on black background
      backgroundColor = "black";
      textColor = "#00ff00";
      print("Color changed to green on black.");
      break;
    case "0F": // White text on black
      backgroundColor = "black";
      textColor = "#ffffff";
      print("Color changed to white on black.");
      break;
    case "07": // Default gray text on black (Windows default)
      backgroundColor = "black";
      textColor = "#c0c0c0";
      print("Color changed to default gray on black.");
      break;
    default:
      print("Color code not recognized in this demo. Try 0A, 0F, or 07.");
      return;
  }

  // Apply changes **only** to the CLI window, not the whole body
  document.getElementById("cli-window").style.backgroundColor = backgroundColor;
  document.getElementById("terminal").style.backgroundColor = backgroundColor;

  // Apply text color to output, prompt, and input
  document.querySelectorAll("#output div").forEach(el => {
    el.style.color = textColor;
  });
  document.getElementById("output").style.color = textColor;
  document.getElementById("prompt").style.color = textColor;
  document.getElementById("command-input").style.color = textColor;
}



/**
 * "cls" command
 */
function handleCls() {
  outputEl.innerHTML = "";
}

/**
 * "help" command
 */
function handleHelp() {
  const lines = [
    ["dir [options]",       "Displays a list of files and subdirectories in a directory."],
    ["cd <dir>",     "Change directory"],
    ["type <file>",     "Displays the contents of a text file."],
    ["rename <old> <new>",  "Renames a file or files."],
    ["tree",            "Graphically displays the directory structure of a drive or path."],
    ["cls",            "Clears the screen."],
    ["findstr",   "Searches for strings in files."],
    ["attrib",   "Displays or changes file attributes."],
    ["copy",   "Copies one or more files to another location."],
    ["move",   "Moves one or more files from one directory to another directory."],
    ["del",   "Deletes one or more files."],
    ["echo",   "Displays messages, or turns command echoing on or off."],
    ["title",   "Sets the window title for a CMD.EXE session."],
    ["color",   "Sets the default console foreground and background colors."],
    ["help",            "Show this help"]
  ];

  print("");
  // Pad commands so they align
lines.forEach(([cmd, desc]) => {
  const cmdPadded = cmd.padEnd(18, " "); // Apply padding first
  const cmdEscaped = cmdPadded.replace(/</g, "&lt;").replace(/>/g, "&gt;"); // Then escape
  print(`  ${cmdEscaped} - ${desc}`);
});

  print("");
}

// ----- MAIN COMMAND HANDLER -----
function handleCommand(line) {
  const { cmd, args } = parseInput(line);
  switch(cmd) {
    case 'dir':
      handleDir(args);
      break;
    case 'cd':
      handleCd(args);
      break;
    case 'type':
      handleType(args);
      break;
    case 'rename':
      handleRename(args);
      break;
    case 'tree':
      handleTree();
      break;
    case 'findstr':
      handleFindstr(args);
      break;
    case 'attrib':
      handleAttrib(args);
      break;
    case 'copy':
      handleCopy(args);
      break;
    case 'move':
      handleMove(args);
      break;
    case 'del':
      handleDel(args);
      break;
    case 'echo':
      handleEcho(args);
      break;
    case 'title':
      handleTitle(args);
      break;
    case 'color':
      handleColor(args);
      break;
    case 'cls':
      handleCls();
      break;
    case 'help':
      handleHelp();
      break;
    case '':
      // Just a blank enter
      break;
    default:
      print(`'${cmd}' is not recognized as an internal or external command,\noperable program or batch file.`);
  }

  // ** Ensure input is cleared after every command **
  inputEl.value = "";
}

// ----- THEME / COLOR HANDLING -----

function setDarkMode(textColor) {
  currentMode = "dark";
  currentColor = textColor;
  document.body.style.backgroundColor = "black";
  document.getElementById("terminal").style.backgroundColor = "black";
  document.body.style.color = textColor === "green" ? "#00ff00" : "#ffffff";
  document.getElementById("terminal").style.color = document.body.style.color;
}

function setLightMode(textColor) {
  currentMode = "light";
  currentColor = textColor;
  document.body.style.backgroundColor = "white";
  document.getElementById("terminal").style.backgroundColor = "white";
  document.body.style.color = textColor;
  document.getElementById("terminal").style.color = textColor;
}

// Event: user pressed ENTER
inputEl.addEventListener('keydown', function(e) {
  if (e.key === "Enter") {
    const command = inputEl.value;

    if (command !== "") {
      commandHistory.push(command);
      if (commandHistory.length > 50) commandHistory.shift(); // Limit history size
      historyIndex = commandHistory.length;
    }

    const pathString = getCurrentPathString().split("\\").slice(1).join("\\");
    print(`C:\\${pathString} ${command}`);
    handleCommand(command);
    inputEl.value = "";
  }else if (e.key === "ArrowUp") {
    if (historyIndex > 0) {
      historyIndex--;
      inputEl.value = commandHistory[historyIndex];
    }
    e.preventDefault();
  } else if (e.key === "ArrowDown") {
    if (historyIndex < commandHistory.length - 1) {
      historyIndex++;
      inputEl.value = commandHistory[historyIndex];
    } else {
      historyIndex = commandHistory.length;
      inputEl.value = "";
    }
    e.preventDefault();
  }
});

// INITIAL SETUP: fetch the JSON, build the fileSystem, set currentDirectory
fetch("file_contents.JSON")
  .then(res => res.json())
  .then(contents => {
    fileSystem = buildFileSystem(contents);
    currentDirectory = fileSystem;
    print("Welcome to the Dungeon Crawl CLI! Type 'help' for commands.");
  })
  .catch(err => {
    console.error("Error loading file contents:", err);
    print("Error loading file contents! Check console for details.");
  });
