/***************************************************
 * Enhanced Windows-style CLI in the Browser v12
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

// Set to track directories that have been visited
let visitedDirectories = new Set();

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
 * Recursively search within 'dir' for an entry matching 'name' (case sensitive)
 * Return the entry or null
 */
const findEntryInDir = (dir, name) => {
  if (!dir || !dir.children) {
    console.warn("findEntryInDir: Directory is null or has no children.");
    return null;
  }
  return dir.children.find((child) => child.name === name) || null;
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
      print("Invalid option. Usage: dir [option]  ('/A' or '/a' shows all hidden files and directories)\n\nEXAMPLE: dir /A");
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
    print(`               ${d.name}  <DIR>`);
  });
  files.forEach(f => {
    print(`               ${f.name}  <file>`);
  });
}

/**
 * "cd" command
 *  usage: cd <foldername> or cd .. to go up
 *  or cd <full path> to navigate directly to that path
 */
const handleCd = (args) => {
  // if (args.length === 0) {
  //   // cd with no arg -> root
  //   currentDirectory = fileSystem;
  //   markDirectoryVisited(currentDirectory);
  //   promptEl.textContent = "C:\\>";
  //   return;
  // }
  
  if (!args.length) {
    print("Usage: cd [dir]\n\nEXAMPLE: cd C:");
    return;
  }
  
  const target = args[0];
  
  // Special case for ".."
  if (target === "..") {
    // Go up to parent directory if not at root
    if (currentDirectory === fileSystem) {
      print("Already at root.");
    } else if (currentDirectory.parent) {
      currentDirectory = currentDirectory.parent;
      markDirectoryVisited(currentDirectory);
      updatePrompt();
    } else {
      print("Cannot navigate to parent directory.");
    }
    return;
  }
  
  // Check if this is a full path (starts with C:\ or contains \ or /)
  if (target.match(/^[Cc]:\\/) || target.includes('\\') || target.includes('/') || target.startsWith('./') || target.startsWith('.\\')) {
    // Use the navigateToPath function to find the target directory
    const targetDir = navigateToPath(target);
    
    if (!targetDir) {
      print(`Directory not found: ${target}`);
      return;
    }
    
    if (targetDir.type !== 'dir') {
      print(`${targetDir.name} is not a directory.`);
      return;
    }
    
    // Check for locked door condition
    if (targetDir.name === 'LockedDoor') {
      print("This door is locked and holds strong when you attempt to force it open.");
      return;
    }
    
    // Check for locked ReadingChamber
    if (targetDir.name === 'ReadingChamber' && targetDir.attributeFlags?.locked) {
      print("The entrance is shrouded in dark energy. You cannot enter until the source is eliminated.");
      return;
    }
    
    // Change to the target directory
    currentDirectory = targetDir;
    markDirectoryVisited(currentDirectory);
    updatePrompt();
    return;
  }
  
  // If it's a simple directory name, find it directly with case sensitivity
  const found = currentDirectory.children?.find(entry => 
    entry.name === target && entry.type === 'dir'
  );
  
  if (!found) {
    print(`Directory not found: ${target}`);
    return;
  }
  
  // Check for locked door condition
  if (found.name === 'LockedDoor') {
    print("This door is locked and holds strong when you attempt to force it open.");
    return;
  }
  
  // Check for locked ReadingChamber
  if (found.name === 'ReadingChamber' && found.attributeFlags?.locked) {
    print("The entrance is shrouded in dark energy. You cannot enter until the source is eliminated.");
    return;
  }
  
  // Move to the found directory
  currentDirectory = found;
  markDirectoryVisited(currentDirectory);
  updatePrompt();
}

/**
 * "type" command
 *  usage: type <filename>
 */
const handleType = (args) => {
  if (!args.length) {
    print("Usage: type [filename]\n\nEXAMPLE: type README.md");
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
    print("Usage: rename [old file name] [new file name]\n\nEXAMPLE: rename README.md TAKENOTES.always");
    return;
  }
  
  const [oldName, newName] = args;
  const entry = findEntryInDir(currentDirectory, oldName);
  
  if (!entry) {
    print(`File not found: ${oldName}`);
    return;
  }
  
  // Check if it's a directory
  if (entry.type === 'dir') {
    print(`Cannot rename directory: ${oldName}`);
    return;
  }
  
  if (currentDirectory.children.some(child => child.name === newName && child !== entry)) {
    print(`A file named '${newName}' already exists`);
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
 *  Shows directory structure of visited directories
 */
const handleTree = (args) => {
  // Start from current directory
  const startDir = currentDirectory;
  print(startDir.name);
  
  // Mark the root directory as visited initially
  if (!visitedDirectories.has(fileSystem)) {
    visitedDirectories.add(fileSystem);
  }
  
  // Helper function to recursively print directory structure
  const printTree = (dir, prefix = "") => {
    if (!dir.children) return;
    
    // Filter entries to only include visited directories and files in visited directories
    const entries = [...dir.children].filter(entry => {
      // Always include files in a visited directory
      if (entry.type === 'file') return true;
      
      // Only include directories that have been visited
      return visitedDirectories.has(entry);
    });
    
    // Print each entry with appropriate prefixes
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const isLast = i === entries.length - 1;
      const entryPrefix = isLast ? "└── " : "├── ";
      const childPrefix = isLast ? "    " : "│   ";
      
      print(`${prefix}${entryPrefix}${entry.name}`);
      
      // Recursively print subdirectories only if they've been visited
      if (entry.type === 'dir' && visitedDirectories.has(entry)) {
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
    print("Usage: findstr [pattern] [file]\n\nEXAMPLE: findstr Chalice C:\\README.md");
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
    
    // Special case for OldRecords.tome code
    if (fileName === 'OldRecords.tome' && pattern === '83') {
      print('\nCLUE DISCOVERED: Read entry #83.');
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
 */
const handleAttrib = (args) => {
  if (!args.length) {
    print("Usage: attrib [option] [filename]   (options: '-r' Removes read-only attribute, '-h' Removes hidden attribute, Replace '-' with '+' to add an attribute\n\nEXAMPLE: attrib -r README.md");
    return;
  }

  // If the last arg is a filename, parse the earlier ones as flags
  const filename = args[args.length - 1];
  const found = findEntryInDir(currentDirectory, filename);
  if (!found) {
    print(`File not found: ${filename}`);
    return;
  }
  
  // Check if it's a directory
  if (found.type === 'dir') {
    print(`Cannot set attributes on directory: ${filename}`);
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
      if (found.name === 'CursedBook.tome') {
        print("Emergency elimination counter curse initiated on cursed object...");
        
        // Remove the file
        currentDirectory.children = currentDirectory.children.filter(child => child !== found);
        
        // Find and unlock ReadingChamber
        const ReadingChamber = currentDirectory.children.find(c => c.name === 'ReadingChamber');
        if (ReadingChamber) {
          ReadingChamber.attributeFlags.hidden = false;
          ReadingChamber.attributeFlags.locked = false;
          print("The cursed book disintegrates completely! The dark energy dissipates, revealing a hidden reading chamber that you can now enter.");
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
 * Additional Command: "copy" (duplicates the file while leaving the original intact)
 *  usage: copy <source> <destination>
 */
const handleCopy = (args) => {
  if (args.length < 2) {
    print("Usage: copy [source file] [destination dir]\n\nEXAMPLE: copy README.md C:\\EntranceGrounds\\OuterWalls");
    return;
  }
  
  const [src, dest] = args;
  
  // --- Handle source path ---
  let srcDir = currentDirectory;
  let srcName = src;
  
  if (src.includes('/') || src.includes('\\')) {
    const srcParts = src.split(/[\/\\]/);
    srcName = srcParts.pop(); // Extract the filename
    const srcPath = srcParts.join('/');
    if (srcPath) {
      srcDir = navigateToPath(srcPath);
      if (!srcDir) {
        print(`Source directory not found: ${srcPath}`);
        return;
      }
    }
  }
  
  // Locate the source entry (case-sensitive)
  const srcEntry = srcDir.children?.find(entry => entry.name === srcName);
  if (!srcEntry) {
    print(`Source not found: ${srcName}`);
    return;
  }

  // Check if source is a directory
  if (srcEntry.type === 'dir') {
    print(`Cannot copy directory: ${srcName}`);
    return;
  }
  
  // --- Handle destination path ---
  let destDir = currentDirectory;
  let destName = srcName; // Default to the source file's name
  
  if (dest.endsWith('\\') || dest.endsWith('/')) {
    // Destination is explicitly a directory path.
    destDir = navigateToPath(dest);
  } else if (dest.includes('/') || dest.includes('\\')) {
    // Destination includes slashes but does not end with one:
    // treat the last segment as the new filename.
    const destParts = dest.split(/[\/\\]/);
    destName = destParts.pop();
    const destPath = destParts.join('/');
    destDir = destPath ? navigateToPath(destPath) : currentDirectory;
  } else {
    // No slashes: check if it's an existing directory in the current directory.
    const possibleDir = findEntryInDir(currentDirectory, dest);
    if (possibleDir && possibleDir.type === 'dir') {
      destDir = possibleDir;
      destName = srcName;
    } else {
      destName = dest; // New filename in current directory.
    }
  }
  
  if (!destDir) {
    print("Destination directory not found");
    return;
  }
  
  // Check if destination already has a file with the same name (case-sensitive)
  if (destDir.children && destDir.children.some(child => child.name === destName)) {
    print(`A file named '${destName}' already exists in the destination.`);
    return;
  }
  
  // --- Perform Copy ---
  // Create a deep copy of the source entry, update its name and parent pointer.
  const copyFile = JSON.parse(JSON.stringify(srcEntry));
  copyFile.name = destName;
  copyFile.parent = destDir;
  
  if (!destDir.children) {
    destDir.children = [];
  }
  destDir.children.push(copyFile);
  
  print(`Copied ${src} to ${dest}`);
};

/**
 * Additional Command: "move" (copies the file then removes the original)
 *  usage: move <source> <destination>
 */
const handleMove = (args) => {
  if (args.length < 2) {
    print("Usage: move [source file] [destination dir]\n\nEXAMPLE:move README.md C:\\EntranceGrounds\\OuterWalls");
    return;
  }

  const [src, dest] = args;

  // --- Handle source path ---
  let srcDir = currentDirectory;
  let srcName = src;

  if (src.includes('/') || src.includes('\\')) {
    const srcParts = src.split(/[\/\\]/);
    srcName = srcParts.pop(); // Extract the filename
    const srcPath = srcParts.join('/');
    if (srcPath) {
      srcDir = navigateToPath(srcPath);
      if (!srcDir) {
        print(`Source directory not found: ${srcPath}`);
        return;
      }
    }
  }

  // Locate the source entry (attempt exact match in the determined directory)
  let srcEntry = srcDir.children?.find(entry => 
    entry.name === srcName
  );
  
  if (!srcEntry) {
    // Fallback: perform a recursive search in srcDir for a partial match
    srcEntry = findFileRecursively(srcDir, srcName);
    if (srcEntry) {
      // Update srcDir to the parent of the found entry
      srcDir = srcEntry.parent;
    } else {
      print(`Source not found: ${srcName}`);
      return;
    }
  }

  // --- Handle destination path ---
  let destDir, destName;
  
  // First, try to resolve the entire destination as a directory
  let resolvedDest = navigateToPath(dest);
  if (resolvedDest && resolvedDest.type === 'dir') {
    // The destination path itself is a valid directory.
    destDir = resolvedDest;
    destName = srcName; // Preserve the source file's name
  } else {
    // Otherwise, split the destination into directory and file name parts.
    const destParts = dest.split(/[\/\\]/);
    destName = destParts.pop();
    const destPath = destParts.join('/');
    destDir = destPath ? navigateToPath(destPath) : currentDirectory;
  }

  if (!destDir) {
    print("Destination directory not found");
    return;
  }

  // Check if destination already has a file or directory with the same name
  if (destDir.children && destDir.children.some(child => child.name === destName)) {
    print(`A file or directory named '${destName}' already exists in the destination.`);
    return;
  }

  // Update the source entry's name and parent pointer, then assign it for moving
  srcEntry.name = destName;
  srcEntry.parent = destDir;
  const movedEntry = srcEntry;

  // Add to destination directory
  if (!destDir.children) destDir.children = [];
  destDir.children.push(movedEntry);

  // Remove the original file by reference
  const srcIndex = srcDir.children.findIndex(entry => entry === srcEntry);
  if (srcIndex !== -1) {
    srcDir.children.splice(srcIndex, 1);
  }

  print(`Moved ${src} to ${dest}`);

  // Special case for StoneKey: if moved into InnerKeep, open the locked door
  if (movedEntry && movedEntry.name === 'StoneKey.key' && destDir.name === 'InnerKeep') {
    const lockedDoor = findLockedDoorInKeep(destDir);
    if (lockedDoor) {
      lockedDoor.name = 'OpenedDoor';
      lockedDoor.attributeFlags.readOnly = false;
      lockedDoor.attributeFlags.locked = false;
      print("\nThe Stone Key glows brightly as you place it in the Inner Keep. The massive locked door slowly swings open!");
    }
  }
};

/**
 * Helper function to find the LockedDoor in the Keep
 */
const findLockedDoorInKeep = (directory) => {
  // First, look directly in this directory
  const lockedDoor = directory.children?.find(c => c.name === 'LockedDoor');
  if (lockedDoor) return lockedDoor;
  
  // Not found directly, search recursively if needed
  return null;
}

/**
 * Helper function to navigate to a path and return the directory
 * @param {string} path - Path to navigate to (can be absolute like "C:\Something")
 * @returns {object|null} - The directory object or null if not found
 */
const navigateToPath = (path) => {
  if (!path || path.trim() === '') {
    return currentDirectory;
  }

  // Normalize path: replace backslashes with forward slashes and trim
  const normalizedPath = path.trim().replace(/\\/g, '/');

  // Split by slashes and filter out empty segments
  const parts = normalizedPath.split('/').filter(part => part !== '');

  // Determine if this is an absolute or relative path
  let currentDir;
  let startIndex = 0;

  // Check for "C:" at the beginning (case insensitive)
  if (parts.length > 0 && parts[0].match(/^[a-z]:$/i)) {
    currentDir = fileSystem; // Start from root
    startIndex = 1; // Skip the drive letter part
  } else if (normalizedPath.startsWith('/')) {
    currentDir = fileSystem; // Start from root
  } else {
    currentDir = currentDirectory; // Relative path starts from current directory
  }

  // Navigate through the path parts with case-sensitive matching
  for (let i = startIndex; i < parts.length; i++) {
    const part = parts[i];

    if (part === '.') {
      continue;
    } else if (part === '..') {
      if (currentDir !== fileSystem && currentDir.parent) {
        currentDir = currentDir.parent;
      }
    } else {
      // Use case-sensitive matching for directory names
      const child = currentDir.children?.find(c =>
        c.type === 'dir' && c.name === part
      );
      if (!child) {
        return null;
      }
      currentDir = child;
    }
  }

  return currentDir;
};

/**
 * Recursively search within 'dir' for a file entry matching 'name' (case sensitive)
 * Return the entry if found, otherwise null.
 */
const findFileRecursively = (dir, name) => {
  if (!dir || !dir.children) return null;
  for (const child of dir.children) {
    if (child.type === 'file' && child.name === name) {
      return child;
    }
    if (child.type === 'dir') {
      const found = findFileRecursively(child, name);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Additional Command: "del"
 *  usage: del <filename>
 */
const handleDel = (args) => {
  if (args.length === 0) {
    print("Usage: del [file]\n\nEXAMPLE: del README.md");
    return;
  }
  
  const fileName = args[0];
  const file = findEntryInDir(currentDirectory, fileName);
  
  if (!file) {
    print(`File not found: ${fileName}`);
    return;
  }
  
  // Check if it's a directory
  if (file.type === 'dir') {
    print(`Cannot delete directory: ${fileName}`);
    return;
  }
  
  // Check if the file is read-only
  if (file.attributeFlags?.readOnly) {
    // Special case for CursedBook.tome
    if (file.name === 'CursedBook.tome') {
      print(`The Cursed Book resists your attempt to destroy it. Use 'attrib [option] CursedBook.tome' to remove its read-only attribute to weaken its magic first.`);
      return;
    }
    print(`Cannot delete ${fileName}: Access is denied.`);
    return;
  }
  
  // Remove the file
  currentDirectory.children = currentDirectory.children.filter(child => child !== file);
  
  // Special case: When CursedBook.tome is deleted, reveal ReadingChamber
  if (fileName === 'CursedBook.tome') {
    const ReadingChamber = currentDirectory.children.find(c => c.name === 'ReadingChamber');
    if (ReadingChamber) {
      ReadingChamber.attributeFlags.hidden = false;
      print(`\nAs the book vanishes, a hidden reading chamber appears in the wall!`);
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
    print("Usage: color [option]  (options: '0A' for green, '0F' for white, '0P' for light purple, '07' for default gray).\n\nEXAMPLE: color 0P");
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
    case "0P": // Light purple text on black
      backgroundColor = "black";
      textColor = "#d0a0ff";
      print("Color changed to light purple on black.");
      break;
    case "07": // Default gray text on black (Windows default)
      backgroundColor = "black";
      textColor = "#c0c0c0";
      print("Color changed to default gray on black.");
      break;
    default:
      print("Color code not recognized in this demo. Try 0A, 0F, 0P, or 07.");
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
    ["dir [options]",            "Displays a list of files and subdirectories in a directory."],
    ["cd [dir]",                 "Change directory. Use 'cd ..' to go up one directory level."],
    ["type [file]",              "Displays the contents of a text file."],
    ["rename [old] [new]",       "Renames a file or files."],
    ["tree",                     "Graphically displays the structure of the directories that you have visited."],
    ["cls",                      "Clears the screen. Enter this command to remove distractions."],
    ["findstr [pattern] [file]", "Searches for text patterns in files."],
    ["attrib [options] [file]",  "Displays or changes file attributes."],
    ["copy [file] [destination]","Copies a file to a destination dir."],
    ["move [file] [destination]","Moves a file to a destination dir."],
    ["del [file]",               "Deletes a file."],
    ["echo [message]",           "Displays messages to the terminal window."],
    ["title [new_title]",        "Sets a new window title."],
    ["color [option]",           "Sets console foreground and background colors (0A, 0F, 0P, 07)."],
    ["help",                     "Show this help."]
  ];

  printStyled("", {});

  // Apply padding correctly
  lines.forEach(([cmd, desc]) => {
    const cmdPadded = cmd.padEnd(29, " ");
    printStyled(`  ${cmdPadded} - ${desc}`, {});
  });

  printStyled("", {});
  printStyled("\n  TIP: Press Tab for command auto-completion", { color: "#ffff00", italic: true });
  printStyled("", {});
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

// Mark the current directory as visited whenever CD is used
const markDirectoryVisited = (directory) => {
  if (directory) {
    visitedDirectories.add(directory);
  }
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

/**
 * Function to recursively index files for quick access
 */
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
