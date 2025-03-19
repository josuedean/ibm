/***************************************************
 * Enhanced Windows-style CLI in the Browser v7
 ****************************************************/

let fileSystem = null; // We’ll build this after fetching the JSON
let currentDirectory = null;

// For quick references to certain files if needed:
const fileIndex = {};

// Theme handling: We keep track of the current mode & color
let currentMode = "dark"; // or "light"
let currentColor = "green"; // or "white", "black", "blue"

// Command history storage
const commandHistory = [];
let historyIndex = -1;

// DOM references
const outputEl = document.getElementById('output');
const inputEl = document.getElementById('command-input');
const promptEl = document.getElementById('prompt');

// ----- Utility Functions -----
const print = (text) => {
  const line = document.createElement("div");
  line.textContent = text;
  outputEl.appendChild(line);

  // Ensure the terminal always scrolls to the bottom
  const terminalEl = document.getElementById("terminal");
  terminalEl.scrollTop = terminalEl.scrollHeight;
}

const getCurrentPathString = () => {
  return promptEl.textContent.replace('>', '');
}

/**
 * Recursively search within 'dir' for an entry matching 'name' (case-insensitive)
 * Return the entry or null
 */
const findEntryInDir = (dir, name) => {
  if (!dir || !dir.children) {
    console.warn("findEntryInDir: Directory is null or has no children.");
    return null;
  }
  return dir.children.find((child) => child.name.toLowerCase() === name.toLowerCase()) || null;
}

/**
 * parse command line input
 */
const parseInput = (input) => {
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
const handleDir = (args) => {
  if (args.length > 0) {
    if (args.length !== 1 || args[0].toLowerCase() !== "/a") {
      print("Invalid option. Usage: dir /a");
      return;
    }
  }
  
  // Define showHidden based on presence of /a argument
  const showHidden = args.length > 0;
  
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
    print(`<DIR>          ${d.name}`);
  });
  files.forEach(f => {
    print(`               ${f.name}`);
  });
}

/**
 * "cd" command
 *  usage: cd <foldername> or cd .. to go up (we might limit or do partial)
 */
const handleCd = (args) => {
  if (args.length === 0) {
    // cd with no arg -> root
    currentDirectory = fileSystem;
    promptEl.textContent = "C:\\>";
    return;
  }
  const target = args[0];
  if (target === "..") {
    // Go up to parent directory if not at root
    if (currentDirectory === fileSystem) {
      print("Already at root.");
    } else if (currentDirectory.parent) {
      currentDirectory = currentDirectory.parent;
      updatePrompt();
    } else {
      print("Cannot navigate to parent directory.");
    }
    return;
  }

  // find a subdirectory with the given name
  const found = findEntryInDir(currentDirectory, target);
  if (!found) {
    print(`Directory not found: ${target}`);
    return;
  }
  if (found.type !== 'dir') {
    print(`${found.name} is not a directory.`);
    return;
  }
  
  // Check for locked door condition
  if (found.name === 'LockedDoor') {
    print("This door is locked and holds strong when you attempt to force it open.");
    return;
  }
  
  // Check for locked VaultAntechamber
  if (found.name === 'VaultAntechamber' && found.attributeFlags?.locked) {
    print("The entrance is shrouded in dark energy. You cannot enter until the source is eliminated.");
    return;
  }

  // move in
  currentDirectory = found;
  updatePrompt();
}

/**
 * "type" command
 *  usage: type <filename>
 */
const handleType = (args) => {
  if (!args.length) {
    print("Usage: type <filename>");
    return;
  }
  const filename = args[0];
  const found = findEntryInDir(currentDirectory, filename);
  if (!found) {
    print(`File not found: ${filename}`);
    return;
  }
  if (found.type !== 'file') {
    print(`${found.name} is not a file.`);
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
const handleRename = (args) => {
  if (args.length !== 2) {
    print("Usage: rename <oldname> <newname>");
    return;
  }
  
  const [oldName, newName] = args;
  const entry = findEntryInDir(currentDirectory, oldName);
  
  if (!entry) {
    print(`File/directory not found: ${oldName}`);
    return;
  }
  
  if (currentDirectory.children.some(child => child.name === newName && child !== entry)) {
    print(`A file/directory named '${newName}' already exists`);
    return;
  }
  
  // Check if the entry is read-only
  if (entry.attributeFlags?.readOnly) {
    print(`Cannot rename: ${oldName} is read-only.`);
    return;
  }
  
  entry.name = newName;
  print(`Renamed ${oldName} to ${newName}`);
}

/**
 * "tree" command
 *  Recursively shows directory structure from current directory
 */
const handleTree = (args) => {
  // Start from current directory
  const startDir = currentDirectory;
  print(startDir.name);
  
  // Helper function to recursively print directory structure
  const printTree = (dir, prefix = "") => {
    if (!dir.children) return;
    
    // Get all directories and files
    const entries = [...dir.children];
    
    // Print each entry with appropriate prefixes
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const isLast = i === entries.length - 1;
      const entryPrefix = isLast ? "└── " : "├── ";
      const childPrefix = isLast ? "    " : "│   ";
      
      print(`${prefix}${entryPrefix}${entry.name}`);
      
      // Recursively print subdirectories
      if (entry.type === 'dir') {
        printTree(entry, prefix + childPrefix);
      }
    }
  };
  
  // Start the recursive printing
  printTree(startDir);
}

/**
 * Search for patterns in files
 * Usage: findstr <pattern> <filename>
 */
const handleFindstr = (args) => {
  if (args.length < 2) {
    print("Usage: findstr <pattern> <filename>");
    return;
  }
  
  const [pattern, fileName] = args;
  const file = findEntryInDir(currentDirectory, fileName);
  
  if (!file || file.type !== 'file') {
    print(`File not found: ${fileName}`);
    return;
  }
  
  const content = file.content;
  const lines = content.split('\n');
  let matches = [];
  
  lines.forEach((line, index) => {
    if (line.includes(pattern)) {
      matches.push(`Line ${index + 1}: ${line}`);
    }
  });
  
  if (matches.length > 0) {
    print(`Found ${matches.length} match${matches.length > 1 ? 'es' : ''} in ${fileName}:\n${matches.join('\n')}`);
    
    // Special case for OldRecords.txt code
    if (fileName === 'OldRecords.txt' && pattern === '1987') {
      print('\nSECRET DISCOVERED: You found the ancient code (1987)!');
      print('This might be useful elsewhere in the fortress...');
    }
  } else {
    print(`Pattern '${pattern}' not found in ${fileName}`);
  }
};

/**
 * "attrib" command
 *  usage: attrib <filename> to show attributes
 *         attrib +/-h +/-r <filename> to set/unset hidden or readOnly
 *         attrib -elim <filename> to use special elimination protocol
 */
const handleAttrib = (args) => {
  if (!args.length) {
    print("Usage: attrib [-r][+r] [-h] [+h] [-elim] <filename>\n\n-   Removes an attribute\n+   Adds an attribute\nR   Read-only file attribute.\nH   Hidden file attribute.\nelim  Emergency elimination protocol (for cursed objects)");
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
    // Special case for the emergency elimination protocol
    if (flags.includes('-elim')) {
      if (found.name === 'CursedBook.txt') {
        print("Emergency elimination protocol initiated on cursed object...");
        
        // Remove the file
        currentDirectory.children = currentDirectory.children.filter(child => child !== found);
        
        // Find and unlock VaultAntechamber
        const vaultAntechamber = currentDirectory.children.find(c => c.name === 'VaultAntechamber');
        if (vaultAntechamber) {
          vaultAntechamber.attributeFlags.hidden = false;
          vaultAntechamber.attributeFlags.locked = false;
          print("The cursed book disintegrates completely! The dark energy dissipates, revealing a hidden antechamber that you can now enter.");
        }
        return;
      } else {
        print("Emergency elimination protocol can only be used on cursed objects.");
        return;
      }
    }
    
    // Regular attribute operations
    flags.forEach(flag => {
      if (flag === '+h') found.attributeFlags.hidden = true;
      if (flag === '-h') found.attributeFlags.hidden = false;
      if (flag === '+r') found.attributeFlags.readOnly = true;
      if (flag === '-r') found.attributeFlags.readOnly = false;
    });
    showAttributes(found);
  }
}

const showAttributes = (fileOrDir) => {
  let flags = "";
  if (fileOrDir.attributeFlags.hidden) flags += "H ";
  if (fileOrDir.attributeFlags.readOnly) flags += "R ";
  print(`${fileOrDir.name} [${flags.trim() || "none"}]`);
}

/**
 * Additional Command: "copy" (just duplicating the file in the same dir for demo)
 *  usage: copy <source> <dest>
 */
const handleCopy = (args) => {
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
 * move <source> <destination>
 * Moves a file or folder from one location to another, then removes it from the original location.
 */
const handleMove = (args) => {
  if (args.length < 2) {
    print("Usage: move <source> <destination>");
    return;
  }
  
  const [src, dest] = args;

  // Helper to decide if user typed root path (e.g. "C:", "C:\\")
  // Adjust as needed if your environment uses a different root name or notation
  const isRootPath = (path) => {
    return !path || path === "C:" || path === "C:\\" || path === "/";
  };

  // Resolve a path string to a directory object (or null if not found)
  // If path is root-like, return the root directory immediately
  const resolveDirectory = (path) => {
    if (isRootPath(path)) {
      return rootDirectory; // however you reference the top-level "C:\\" object
    }
    return navigateToPath(path); // your existing function that finds a directory by path
  };

  // -- 1. Identify source directory + item name --
  let srcDir = currentDirectory;
  let srcName = src;

  if (src.includes("/") || src.includes("\\")) {
    const srcParts = src.split(/[\/\\]/);
    srcName = srcParts.pop();              // filename or folder name
    const srcPath = srcParts.join("/");    // everything before the last slash
    if (srcPath) {
      srcDir = resolveDirectory(srcPath);
      if (!srcDir) {
        print(`Source directory not found: ${srcPath}`);
        return;
      }
    }
  }

  // Make sure the source file/folder exists
  const srcEntry = findEntryInDir(srcDir, srcName);
  if (!srcEntry) {
    print(`Source not found: ${srcName}`);
    return;
  }

  // -- 2. Identify destination directory + name --
  let destDir = currentDirectory;
  let destName = dest;

  if (dest.includes("/") || dest.includes("\\")) {
    const destParts = dest.split(/[\/\\]/);
    destName = destParts.pop();            // filename or folder name
    const destPath = destParts.join("/");  // everything before the last slash

    if (destPath) {
      destDir = resolveDirectory(destPath);
      if (!destDir) {
        print(`Destination directory not found: ${destPath}`);
        return;
      }
    } else {
      // e.g. user typed just "C:\" (which split into ["C:", ""])
      // so check if that is the root
      if (isRootPath(destParts[0])) {
        destDir = rootDirectory;
      }
    }
  } else if (isRootPath(dest)) {
    // if user typed exactly "C:" or "C:\" etc.
    destDir = rootDirectory;
    // in this case, we'll use srcEntry's name as the destination name
    destName = srcEntry.name;
  }

  // If user’s destination was a path ending in slash, or user typed "C:\" with no new name
  if (!destName) {
    destName = srcEntry.name;
  }

  // -- 3. Check if there's already a file/folder by that name in dest --
  if (destDir.children && destDir.children.some(child => child.name === destName)) {
    print(`A file or directory named '${destName}' already exists in the destination.`);
    return;
  }

  // -- 4. Clone the source entry and put it in the destination --
  const movedEntry = JSON.parse(JSON.stringify(srcEntry));
  movedEntry.name = destName;

  if (!destDir.children) {
    destDir.children = [];
  }
  destDir.children.push(movedEntry);

  // -- 5. Remove the original from srcDir by name (not strict object reference) --
  srcDir.children = srcDir.children.filter(entry =>
    !(entry.name === srcEntry.name && entry.type === srcEntry.type)
  );

  print(`Moved ${src} to ${dest}`);

  // -- 6. Special case for StoneKey unlocking the InnerKeep door --
  if (
    movedEntry &&
    movedEntry.name === 'StoneKey.key' &&
    destDir.name === 'InnerKeep'
  ) {
    const lockedDoor = destDir.children.find(c => c.name === 'LockedDoor');
    if (lockedDoor) {
      lockedDoor.name = 'OpenedDoor';
      lockedDoor.attributeFlags.readOnly = false;
      lockedDoor.attributeFlags.locked = false;
      print("\nThe StoneKey glows brightly as you place it in the Inner Keep. The massive locked door slowly swings open!");
    }
  }
};


/**
 * Additional Command: "del"
 *  usage: del <filename>
 */
const handleDel = (args) => {
  if (args.length === 0) {
    print("Usage: del <filename>");
    return;
  }
  
  const fileName = args[0];
  const file = findEntryInDir(currentDirectory, fileName);
  
  if (!file) {
    print(`File not found: ${fileName}`);
    return;
  }
  
  // Special case for CursedBook.txt
  if (file.name === 'CursedBook.txt') {
    if (file.attributeFlags?.readOnly) {
      print(`The cursed book resists your attempt to destroy it. Use 'attrib -r CursedBook.txt' to weaken its magic first.`);
      return;
    } else {
      print(`The cursed book dissolves into ethereal smoke...`);
    }
  } else if (file.attributeFlags?.readOnly) {
    print(`Access denied. ${fileName} is read-only.`);
    return;
  }
  
  // Remove the file
  currentDirectory.children = currentDirectory.children.filter(child => child !== file);
  
  // Special case: When CursedBook.txt is deleted, reveal VaultAntechamber
  if (fileName === 'CursedBook.txt') {
    const vaultAntechamber = currentDirectory.children.find(c => c.name === 'VaultAntechamber');
    if (vaultAntechamber) {
      vaultAntechamber.attributeFlags.hidden = false;
      print(`\nAs the book vanishes, a hidden antechamber appears in the wall!`);
    }
  }
  
  print(`Deleted ${fileName}`);
};

/**
 * Additional Command: "echo" 
 */
const handleEcho = (args) => {
  // Just print whatever arguments they pass
  const message = args.join(" ");
  print(message);
}

/**
 * Additional Command: "title"
 */
const handleTitle = (args) => {
  // We won't actually change the browser tab, but let's pretend
  if (!args.length) {
    print("Usage: title <text>");
    return;
  }

  const titleText = args.join(" ");

  // Change the CLI window title (if the element exists)
  const titleElement = document.getElementById('window-title');
  if (titleElement) {
    titleElement.textContent = titleText;
    print(`Window title set to "${titleText}"`);
  } else {
    print("Error: CLI window title element not found.");
  }
}

/**
 * Additional Command: "color"
 *  We also have actual UI buttons for color changes, 
 *  but let's parse "color XY" or something. 
 *  We'll do something minimal here:
 */
const handleColor = (args) => {
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
const handleCls = () => {
  outputEl.innerHTML = "";
}

/**
 * "help" command
 */
const handleHelp = () => {
  const lines = [
    ["dir [options]",       "Displays a list of files and subdirectories in a directory."],
    ["cd <dir>",            "Change directory. Use cd .. to go up one level."],
    ["type <file>",         "Displays the contents of a text file."],
    ["rename <old> <new>",  "Renames a file or files."],
    ["tree",                "Graphically displays the directory structure."],
    ["cls",                 "Clears the screen."],
    ["findstr",             "Searches for strings in files."],
    ["attrib",              "Displays or changes file attributes."],
    ["copy",                "Copies one or more files to another location."],
    ["move",                "Moves files from one directory to another."],
    ["del",                 "Deletes one or more files."],
    ["echo",                "Displays messages."],
    ["title",               "Sets the window title."],
    ["color",               "Sets console foreground and background colors."],
    ["help",                "Show this help"]
  ];

  printStyled("", {});
  printStyled("COMMAND REFERENCE", { color: "#00ff00", bold: true });
  printStyled("=================", { color: "#00ff00" });

  // Apply padding correctly
  lines.forEach(([cmd, desc]) => {
    const cmdPadded = cmd.padEnd(18, " ");
    printStyled(`  ${cmdPadded} - ${desc}`, {});
  });

  printStyled("", {});
  printStyled("TIP: Press Tab for command auto-completion", { color: "#ffff00", italic: true });
  printStyled("", {});
}

// Function to recursively index files for quick access
const indexFiles = (dir) => {
  if (!dir || !dir.children) return;
  
  dir.children.forEach(item => {
    // Add a parent reference to enable easier navigation
    item.parent = dir;
    
    // Index files by name for quick lookup
    if (item.type === 'file') {
      fileIndex[item.name.toLowerCase()] = item;
    }
    
    // Recursively process subdirectories
    if (item.type === 'dir') {
      indexFiles(item);
    }
  });
}

// Helper function to update the prompt based on current directory
const updatePrompt = () => {
  // Build path by traversing up the parent chain
  let path = [];
  let current = currentDirectory;
  
  while (current !== fileSystem && current.parent) {
    path.unshift(current.name);
    current = current.parent;
  }
  
  if (path.length === 0) {
    promptEl.textContent = "C:\\>";
  } else {
    promptEl.textContent = `C:\\${path.join("\\")}\\>`;
  }
}

/**
 * Helper function to navigate to a path and return the directory
 * @param {string} path - Path to navigate to
 * @returns {object|null} - The directory object or null if not found
 */
const navigateToPath = (path) => {
  // Start from root if path begins with / or \
  let currentDir = path.startsWith('/') || path.startsWith('\\') ? fileSystem : currentDirectory;
  
  // Split the path and navigate through each part
  const parts = path.split(/[\/\\]/).filter(part => part !== '');
  
  for (const part of parts) {
    if (part === '..') {
      // Go up one level if possible and if we're not at root
      if (currentDir !== fileSystem && currentDir.parent) {
        currentDir = currentDir.parent;
      }
    } else if (part !== '.') {
      // Find the child directory with this name
      const child = currentDir.children?.find(c => c.name === part && c.type === 'directory');
      if (!child) {
        return null; // Directory not found
      }
      currentDir = child;
    }
    // If part is '.', stay in the current directory (do nothing)
  }
  
  return currentDir;
}

// Add command auto-completion functionality
inputEl.addEventListener('keydown', (e) => {
  if (e.key === "Tab") {
    e.preventDefault(); // Prevent default tab behavior
    
    const input = inputEl.value.trim();
    const parts = input.split(' ');
    
    // If we're at the beginning of a command, auto-complete commands
    if (parts.length === 1 && !input.includes(' ')) {
      const partialCmd = parts[0].toLowerCase();
      if (partialCmd) {
        const commands = [
          'dir', 'cd', 'type', 'rename', 'tree', 'findstr', 'attrib', 
          'copy', 'move', 'del', 'echo', 'title', 'color', 'cls', 'help'
        ];
        
        const matches = commands.filter(cmd => cmd.startsWith(partialCmd));
        if (matches.length === 1) {
          inputEl.value = matches[0] + ' ';
        } else if (matches.length > 1) {
          // Show possible completions
          print(`\nPossible commands: ${matches.join(', ')}`);
        }
      }
    } 
    // Auto-complete filenames and directories
    else if (parts.length > 1) {
      const partialName = parts[parts.length - 1].toLowerCase();
      if (partialName && currentDirectory.children) {
        const matches = currentDirectory.children
          .filter(item => !item.attributeFlags?.hidden)
          .filter(item => item.name.toLowerCase().startsWith(partialName));
        
        if (matches.length === 1) {
          parts[parts.length - 1] = matches[0].name;
          inputEl.value = parts.join(' ');
          // Add trailing space for files, slash for directories
          if (matches[0].type === 'dir') {
            inputEl.value += ' ';
          } else {
            inputEl.value += ' ';
          }
        } else if (matches.length > 1) {
          // Show possible completions
          print(`\nPossible completions: ${matches.map(m => m.name).join(', ')}`);
        }
      }
    }
  }
});

// Enhance the print function to support different styles
const printStyled = (text, style = {}) => {
  const line = document.createElement("div");
  
  // Apply styling
  if (style.color) line.style.color = style.color;
  if (style.bold) line.style.fontWeight = 'bold';
  if (style.italic) line.style.fontStyle = 'italic';
  if (style.underline) line.style.textDecoration = 'underline';
  
  line.textContent = text;
  outputEl.appendChild(line);

  // Ensure the terminal always scrolls to the bottom
  const terminalEl = document.getElementById("terminal");
  terminalEl.scrollTop = terminalEl.scrollHeight;
}

// Enhance help command with better formatting
// Removed duplicate handleHelp function

// ----- THEME / COLOR HANDLING -----
const setDarkMode = (textColor) => {
  currentMode = "dark";
  currentColor = textColor;
  document.body.style.backgroundColor = "black";
  document.getElementById("terminal").style.backgroundColor = "black";
  document.body.style.color = textColor === "green" ? "#00ff00" : "#ffffff";
  document.getElementById("terminal").style.color = document.body.style.color;
}

const setLightMode = (textColor) => {
  currentMode = "light";
  currentColor = textColor;
  document.body.style.backgroundColor = "white";
  document.getElementById("terminal").style.backgroundColor = "white";
  document.body.style.color = textColor;
  document.getElementById("terminal").style.color = textColor;
}

// Enhance the handleCommand function to support command aliases
const handleCommand = (line) => {
  const { cmd, args } = parseInput(line);
  
  // Command aliases
  const commandMap = {
    'ls': 'dir',
    'cat': 'type',
    'mv': 'move',
    'cp': 'copy',
    'rm': 'del',
    'clear': 'cls'
  };
  
  // Use the mapped command if it exists, otherwise use the original
  const resolvedCmd = commandMap[cmd] || cmd;
  
  switch(resolvedCmd) {
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
      handleTree(args);
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

  // Ensure input is cleared after every command
  inputEl.value = "";
}

// ----- MAIN COMMAND HANDLER -----
inputEl.addEventListener('keydown', (e) => {
  if (e.key === "Enter") {
    const command = inputEl.value;

    if (command !== "") {
      commandHistory.push(command);
      if (commandHistory.length > 50) commandHistory.shift(); // Limit history size
      historyIndex = commandHistory.length;
    }

    const pathString = getCurrentPathString().split("\\").slice(1).join("\\");
    print(`C:\\${pathString}> ${command}`);
    print("");
    handleCommand(command);
    inputEl.value = "";
  } else if (e.key === "ArrowUp") {
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
fetch("fileSystem.json")
  .then(res => res.json())
  .then(contents => {
    fileSystem = contents;
    currentDirectory = fileSystem;
    print("Welcome to the Dungeon Crawl CLI! Type 'help' for commands.");
    
    // Index important files for quick access
    indexFiles(fileSystem);
  })
  .catch(err => {
    console.error("Error loading file contents:", err);
    print("Error loading file contents! Check console for details.");
  });
