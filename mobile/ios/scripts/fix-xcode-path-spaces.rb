#!/usr/bin/env ruby
# Patches Xcode shellScript phases that break when the repo path contains spaces.
# pbxproj stores shell scripts with literal \n sequences, not real newlines.

REPLACEMENTS = [
  [
    'WITH_ENVIRONMENT=\"$RCT_SCRIPT_RN_DIR/scripts/xcode/with-environment.sh\"\n/bin/sh -c \"$WITH_ENVIRONMENT $SCRIPT_PHASES_SCRIPT\"\n',
    'WITH_ENVIRONMENT=\"$RCT_SCRIPT_RN_DIR/scripts/xcode/with-environment.sh\"\n. \"$WITH_ENVIRONMENT\"\n/bin/bash \"$SCRIPT_PHASES_SCRIPT\"\n',
  ],
  [
    'WITH_ENVIRONMENT=\"$RCT_SCRIPT_RN_DIR/scripts/xcode/with-environment.sh\"\n\"$WITH_ENVIRONMENT\" \"$SCRIPT_PHASES_SCRIPT\"\n',
    'WITH_ENVIRONMENT=\"$RCT_SCRIPT_RN_DIR/scripts/xcode/with-environment.sh\"\n. \"$WITH_ENVIRONMENT\"\n/bin/bash \"$SCRIPT_PHASES_SCRIPT\"\n',
  ],
  [
    'WITH_ENVIRONMENT=\"$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh\"\nREACT_NATIVE_XCODE=\"$REACT_NATIVE_PATH/scripts/react-native-xcode.sh\"\n\n/bin/sh -c \"$WITH_ENVIRONMENT $REACT_NATIVE_XCODE\"\n',
    'WITH_ENVIRONMENT=\"$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh\"\nREACT_NATIVE_XCODE=\"$REACT_NATIVE_PATH/scripts/react-native-xcode.sh\"\n\n. \"$WITH_ENVIRONMENT\"\n/bin/bash \"$REACT_NATIVE_XCODE\"\n',
  ],
  [
    'WITH_ENVIRONMENT=\"$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh\"\nREACT_NATIVE_XCODE=\"$REACT_NATIVE_PATH/scripts/react-native-xcode.sh\"\n\n\"$WITH_ENVIRONMENT\" \"$REACT_NATIVE_XCODE\"\n',
    'WITH_ENVIRONMENT=\"$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh\"\nREACT_NATIVE_XCODE=\"$REACT_NATIVE_PATH/scripts/react-native-xcode.sh\"\n\n. \"$WITH_ENVIRONMENT\"\n/bin/bash \"$REACT_NATIVE_XCODE\"\n',
  ],
].freeze

paths = ARGV
paths = [
  File.expand_path('../Pods/Pods.xcodeproj/project.pbxproj', __dir__),
  File.expand_path('../SpendWiseMobile.xcodeproj/project.pbxproj', __dir__),
] if paths.empty?

paths.each do |pbxproj_path|
  next unless File.exist?(pbxproj_path)

  contents = File.read(pbxproj_path)
  patched = contents

  REPLACEMENTS.each do |old, new|
    patched = patched.gsub(old, new)
  end

  if patched != contents
    File.write(pbxproj_path, patched)
    puts "Patched: #{pbxproj_path}"
  else
    puts "No changes: #{pbxproj_path}"
  end
end

# Hermes replace_hermes_version.js shells out to tar without quoting paths.
HERMES_SCRIPT_CANDIDATES = [
  File.expand_path('../../../node_modules/react-native/sdks/hermes-engine/utils/replace_hermes_version.js', __dir__),
  File.expand_path('../../node_modules/react-native/sdks/hermes-engine/utils/replace_hermes_version.js', __dir__),
].freeze

HERMES_REPLACEMENTS = [
  [
    "const {execSync} = require('child_process');",
    "const {execFileSync} = require('child_process');",
  ],
  [
    'execSync(`tar -xf ${tarballURLPath} -C ${finalLocation}`);',
    "execFileSync('tar', ['-xf', tarballURLPath, '-C', finalLocation], {stdio: 'inherit'});",
  ],
].freeze

HERMES_SCRIPT_CANDIDATES.each do |hermes_script_path|
  next unless File.exist?(hermes_script_path)

  contents = File.read(hermes_script_path)
  patched = contents

  HERMES_REPLACEMENTS.each do |old, new|
    patched = patched.gsub(old, new)
  end

  if patched != contents
    File.write(hermes_script_path, patched)
    puts "Patched: #{hermes_script_path}"
  else
    puts "No changes: #{hermes_script_path}"
  end
end
