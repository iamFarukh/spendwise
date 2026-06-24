import {useCallback, useEffect, useRef, useState} from 'react';
import {FlatList, Platform, Pressable, StyleSheet, TextInput, View} from 'react-native';
import {
  MIN_SUBSCRIPTION_SEARCH_CHARS,
  SUBSCRIPTION_SEARCH_DEBOUNCE_MS,
  searchSubscriptionAssets,
  type SubscriptionAsset,
} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {SubscriptionLogo} from '@/components/subscription/subscription-logo';
import {IconChevronRight, IconClose, IconPlus, IconSearch} from '@/components/icons';
import {colors, radius, shadow, spacing} from '@/constants/theme';
import {hapticLight} from '@/lib/haptics';

type SubscriptionSearchFieldProps = {
  value: string;
  /** Manual text edits (clears any previously selected asset binding). */
  onChangeText: (text: string) => void;
  /** A result was picked from the dropdown. */
  onSelectAsset: (asset: SubscriptionAsset) => void;
  /** User chose "Add custom" — keep the typed text as a custom name. */
  onAddCustom: () => void;
};

type SearchStatus = 'idle' | 'results' | 'empty';

/**
 * Subscription "Subscription" field with a Google / Apple-style suggestion
 * dropdown. Search is 100% local (the bundled asset library) — instant, no
 * network. Begins after 2 characters, debounced, with an inline
 * "Add Custom Subscription" escape hatch when nothing matches.
 */
export function SubscriptionSearchField({
  value,
  onChangeText,
  onSelectAsset,
  onAddCustom,
}: SubscriptionSearchFieldProps) {
  const [focused, setFocused] = useState(false);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [results, setResults] = useState<SubscriptionAsset[]>([]);

  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Set right after a programmatic select so the populated value won't re-search. */
  const suppressRef = useRef(false);

  const closeDropdown = useCallback(() => {
    setStatus('idle');
    setResults([]);
  }, []);

  // Debounced local search — only while focused.
  useEffect(() => {
    if (!focused) {
      return;
    }
    if (suppressRef.current) {
      suppressRef.current = false;
      return;
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    const query = value.trim();
    if (query.length < MIN_SUBSCRIPTION_SEARCH_CHARS) {
      setResults([]);
      setStatus('idle');
      return;
    }
    debounceRef.current = setTimeout(() => {
      const items = searchSubscriptionAssets(query);
      setResults(items);
      setStatus(items.length > 0 ? 'results' : 'empty');
    }, SUBSCRIPTION_SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, focused]);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (blurRef.current) {
        clearTimeout(blurRef.current);
      }
    },
    [],
  );

  function handleFocus() {
    if (blurRef.current) {
      clearTimeout(blurRef.current);
      blurRef.current = null;
    }
    setFocused(true);
  }

  function handleBlur() {
    // Defer so a tap on a result row wins the race against losing focus.
    blurRef.current = setTimeout(() => setFocused(false), 150);
  }

  function handleSelect(asset: SubscriptionAsset) {
    suppressRef.current = true;
    hapticLight();
    onSelectAsset(asset);
    closeDropdown();
    if (blurRef.current) {
      clearTimeout(blurRef.current);
    }
    setFocused(false);
    inputRef.current?.blur();
  }

  function handleAddCustom() {
    onAddCustom();
    closeDropdown();
    if (blurRef.current) {
      clearTimeout(blurRef.current);
    }
    setFocused(false);
    inputRef.current?.blur();
  }

  const showDropdown = focused && status !== 'idle';

  return (
    <View style={styles.wrap}>
      <View
        style={[styles.inputRow, focused && styles.inputRowFocused]}>
        <IconSearch size={18} color={focused ? colors.mint600 : colors.ink400} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder="Search ChatGPT, Netflix, Spotify…"
          placeholderTextColor={colors.ink400}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
        />
        {value.length > 0 ? (
          <Pressable
            onPress={() => {
              onChangeText('');
              inputRef.current?.focus();
            }}
            hitSlop={8}>
            <IconClose size={16} color={colors.ink400} />
          </Pressable>
        ) : null}
      </View>

      {showDropdown ? (
        <View style={styles.dropdown}>
          {status === 'empty' ? (
            <View style={styles.stateBox}>
              <AppText style={styles.stateTitle}>
                Can&apos;t find your subscription?
              </AppText>
              <AppText variant="xs" muted style={styles.stateHint}>
                Add it manually and fill in the details.
              </AppText>
              <AddCustomButton onPress={handleAddCustom} />
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              removeClippedSubviews
              initialNumToRender={8}
              maxToRenderPerBatch={10}
              windowSize={5}
              ItemSeparatorComponent={Separator}
              ListFooterComponent={
                <Pressable
                  onPress={handleAddCustom}
                  android_ripple={{color: colors.mint100}}
                  style={({pressed}) => [
                    styles.footerRow,
                    pressed && Platform.OS === 'ios' && styles.rowPressed,
                  ]}>
                  <IconPlus size={16} color={colors.mint700} />
                  <AppText style={styles.footerText}>
                    Add Custom Subscription
                  </AppText>
                </Pressable>
              }
              renderItem={({item}) => (
                <ResultRow item={item} onPress={() => handleSelect(item)} />
              )}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

function ResultRow({
  item,
  onPress,
}: {
  item: SubscriptionAsset;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{color: colors.mint100}}
      style={({pressed}) => [
        styles.resultRow,
        pressed && Platform.OS === 'ios' && styles.rowPressed,
      ]}>
      <SubscriptionLogo
        name={item.name}
        iconSlug={item.iconSlug}
        category={item.category}
        color={item.color}
        monogram={item.mark}
        size={38}
      />
      <View style={styles.resultBody}>
        <AppText style={styles.resultName} numberOfLines={1}>
          {item.name}
        </AppText>
        <AppText variant="xs" muted>
          {item.category}
        </AppText>
      </View>
      <IconChevronRight size={16} color={colors.ink400} />
    </Pressable>
  );
}

function AddCustomButton({onPress}: {onPress: () => void}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{color: colors.mint100}}
      style={({pressed}) => [
        styles.addCustomBtn,
        pressed && Platform.OS === 'ios' && styles.rowPressed,
      ]}>
      <IconPlus size={16} color={colors.mint700} />
      <AppText style={styles.addCustomText}>Add Custom Subscription</AppText>
    </Pressable>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  wrap: {position: 'relative', zIndex: 20},
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  inputRowFocused: {borderColor: colors.mint400},
  input: {flex: 1, fontSize: 16, color: colors.ink900, padding: 0},
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 6,
    maxHeight: 320,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    overflow: 'hidden',
    zIndex: 30,
    ...shadow.md,
    elevation: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.paper,
  },
  rowPressed: {backgroundColor: colors.mint50},
  resultBody: {flex: 1, gap: 1},
  resultName: {fontSize: 14, fontWeight: '700', color: colors.ink900},
  separator: {height: 1, backgroundColor: colors.lineSoft, marginHorizontal: 12},
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    backgroundColor: colors.tint,
  },
  footerText: {fontWeight: '700', color: colors.mint700, fontSize: 13},
  stateBox: {padding: 14, gap: 8},
  stateTitle: {fontSize: 14, fontWeight: '700', color: colors.ink900},
  stateHint: {color: colors.ink500},
  addCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.mint50,
    alignSelf: 'flex-start',
  },
  addCustomText: {fontWeight: '700', color: colors.mint700, fontSize: 13},
});
