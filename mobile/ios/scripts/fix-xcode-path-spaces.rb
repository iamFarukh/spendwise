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
