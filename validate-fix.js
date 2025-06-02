#!/usr/bin/env node

/**
 * Simple validation script to verify the sign out button fix
 * This script checks that the necessary changes are present in the code
 */

const fs = require('fs');
const path = require('path');

function checkFile(filePath, checks) {
  console.log(`\n🔍 Checking ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  let allPassed = true;
  
  checks.forEach(({ description, pattern, required = true }) => {
    const found = pattern.test(content);
    const status = found ? '✅' : (required ? '❌' : '⚠️');
    console.log(`${status} ${description}`);
    
    if (required && !found) {
      allPassed = false;
    }
  });
  
  return allPassed;
}

function main() {
  console.log('🔧 Validating Sign Out Button Fix...\n');
  
  const introScreenPath = path.join(__dirname, 'components/IntroScreen.tsx');
  const authContextPath = path.join(__dirname, 'contexts/AuthContext.tsx');
  
  const introScreenChecks = [
    {
      description: 'Profile menu has zIndex: 10',
      pattern: /zIndex:\s*10.*Ensure menu appears above the overlay/s
    },
    {
      description: 'Auth menu has zIndex: 10', 
      pattern: /elevation:\s*6,\s*zIndex:\s*10/s
    },
    {
      description: 'Menu overlay has zIndex: 5',
      pattern: /menuOverlay:\s*{[^}]*zIndex:\s*5/s
    },
    {
      description: 'Logout button handler enhanced with debug logs',
      pattern: /handleLogoutPress.*LOGOUT BUTTON PRESSED/s
    },
    {
      description: 'Profile menu toggle enhanced with debug logs',
      pattern: /toggleProfileMenu.*PROFILE MENU TOGGLE/s
    }
  ];
  
  const authContextChecks = [
    {
      description: 'Logout function enhanced with debug logs',
      pattern: /logout.*=.*console\.log.*LOGOUT INITIATED/s
    },
    {
      description: 'Auth state change handler enhanced with debug logs',
      pattern: /onAuthStateChanged.*console\.log.*AUTH STATE CHANGED/s
    }
  ];
  
  const introScreenValid = checkFile(introScreenPath, introScreenChecks);
  const authContextValid = checkFile(authContextPath, authContextChecks);
  
  console.log('\n📋 Summary:');
  console.log(`IntroScreen.tsx: ${introScreenValid ? '✅ VALID' : '❌ ISSUES FOUND'}`);
  console.log(`AuthContext.tsx: ${authContextValid ? '✅ VALID' : '❌ ISSUES FOUND'}`);
  
  if (introScreenValid && authContextValid) {
    console.log('\n🎉 All checks passed! The sign out button fix appears to be correctly implemented.');
    console.log('\n📝 Next steps:');
    console.log('1. Test the app manually to verify sign out works');
    console.log('2. Check console logs match expected patterns in SIGN_OUT_BUTTON_FIX_TESTING.md');
    console.log('3. Verify menu interactions work correctly');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some checks failed. Please review the implementation.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkFile };