#!/usr/bin/env node

/**
 * Post-install script to fix the parseAspectRatio function in react-native-css-interop
 * This addresses the crash: TypeError: Cannot read properties of undefined (reading '0')
 */

const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'react-native-css-interop';
const FILES_TO_FIX = [
  'src/css-to-rn/parseDeclaration.ts',
  'dist/css-to-rn/parseDeclaration.js'
];

function findPackagePath() {
  // Start from node_modules and work our way up
  let currentDir = process.cwd();
  while (currentDir !== path.dirname(currentDir)) {
    const packagePath = path.join(currentDir, 'node_modules', PACKAGE_NAME);
    if (fs.existsSync(packagePath)) {
      return packagePath;
    }
    currentDir = path.dirname(currentDir);
  }
  throw new Error(`Cannot find ${PACKAGE_NAME} in node_modules`);
}

function fixParseAspectRatio(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if already fixed
  if (content.includes('aspectRatio.ratio && Array.isArray(aspectRatio.ratio)')) {
    console.log(`✅ Already fixed: ${filePath}`);
    return true;
  }

  // Define the original buggy code and the fixed version
  if (filePath.endsWith('.ts')) {
    // TypeScript version
    const originalCode = `  } else {
    if (aspectRatio.ratio[0] === aspectRatio.ratio[1]) {
      return 1;
    } else {
      return aspectRatio.ratio.join(" / ");
    }
  }`;

    const fixedCode = `  } else if (aspectRatio.ratio && Array.isArray(aspectRatio.ratio) && aspectRatio.ratio.length >= 2) {
    if (aspectRatio.ratio[0] === aspectRatio.ratio[1]) {
      return 1;
    } else {
      return aspectRatio.ratio.join(" / ");
    }
  } else {
    // Fallback for malformed aspect ratio declarations
    return "auto";
  }`;

    if (content.includes(originalCode)) {
      content = content.replace(originalCode, fixedCode);
    }
  } else if (filePath.endsWith('.js')) {
    // JavaScript version
    const originalCode = `    else {
        if (aspectRatio.ratio[0] === aspectRatio.ratio[1]) {
            return 1;
        }
        else {
            return aspectRatio.ratio.join(" / ");
        }
    }`;

    const fixedCode = `    else if (aspectRatio.ratio && Array.isArray(aspectRatio.ratio) && aspectRatio.ratio.length >= 2) {
        if (aspectRatio.ratio[0] === aspectRatio.ratio[1]) {
            return 1;
        }
        else {
            return aspectRatio.ratio.join(" / ");
        }
    }
    else {
        // Fallback for malformed aspect ratio declarations
        return "auto";
    }`;

    if (content.includes(originalCode)) {
      content = content.replace(originalCode, fixedCode);
    }
  }

  // Check if any changes were made
  const originalContent = fs.readFileSync(filePath, 'utf8');
  if (content === originalContent) {
    console.log(`⚠️  No pattern matched in: ${filePath}`);
    return false;
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Fixed: ${filePath}`);
  return true;
}

function main() {
  console.log('🔧 Fixing react-native-css-interop parseAspectRatio function...');
  
  try {
    const packagePath = findPackagePath();
    console.log(`📦 Found package at: ${packagePath}`);
    
    let fixedCount = 0;
    for (const relativePath of FILES_TO_FIX) {
      const fullPath = path.join(packagePath, relativePath);
      if (fixParseAspectRatio(fullPath)) {
        fixedCount++;
      }
    }
    
    if (fixedCount > 0) {
      console.log(`🎉 Successfully fixed ${fixedCount} file(s)`);
    } else {
      console.log('ℹ️  No files needed fixing');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixParseAspectRatio, findPackagePath };