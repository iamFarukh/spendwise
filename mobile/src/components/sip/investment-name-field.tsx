import {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  INVESTMENT_SEARCH_DEBOUNCE_MS,
  MIN_INVESTMENT_SEARCH_CHARS,
  getInvestmentNamePlaceholder,
  isSearchableInvestmentType,
  searchMutualFunds,
  type MutualFundSearchResult,
  type SipInvestmentType,
} from '@pfos/shared';

import {AppText} from '@/components/ui/app-text';
import {IconChevronRight, IconClose, IconPlus, IconSearch} from '@/components/icons';
import {colors, radius, shadow, spacing} from '@/constants/theme';
import {hapticLight} from '@/lib/haptics';

type SearchStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

type InvestmentNameFieldProps = {
  /** The chosen investment type, or null when the user hasn't picked one yet. */
  investmentType: SipInvestmentType | null;
  value: string;
  /** Manual text edits (also clears any previously selected scheme code). */
  onChangeText: (text: string) => void;
  /** A result was picked from the dropdown — name + scheme code. */
  onSelectResult: (name: string, schemeCode: number) => void;
};

/**
 * SIP "Name" field with a Google-style suggestion dropdown. For searchable
 * types (mutual funds) it debounces keystrokes, cancels stale requests, and
 * shows results / loading / empty / error inline below the input — without
 * leaving the screen. For other types it's a plain text input.
 */
export function InvestmentNameField({
  investmentType,
  value,
  onChangeText,
  onSelectResult,
}: InvestmentNameFieldProps) {
  const disabled = !investmentType;
  const searchable = isSearchableInvestmentType(investmentType);

  const [focused, setFocused] = useState(false);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [results, setResults] = useState<MutualFundSearchResult[]>([]);

  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** Set right after a programmatic select so the populated value won't re-search. */
  const suppressRef = useRef(false);

  const runSearch = useCallback((query: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('loading');
    searchMutualFunds(query, controller.signal)
      .then(items => {
        if (controller.signal.aborted) {
          return;
        }
        setResults(items);
        setStatus(items.length > 0 ? 'success' : 'empty');
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || (err as Error)?.name === 'AbortError') {
          return;
        }
        setResults([]);
        setStatus('error');
      });
  }, []);

  // Debounced search — only while a searchable type is focused.
  useEffect(() => {
    if (!searchable || !focused) {
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
    if (query.length < MIN_INVESTMENT_SEARCH_CHARS) {
      abortRef.current?.abort();
      setResults([]);
      setStatus('idle');
      return;
    }
    debounceRef.current = setTimeout(
      () => runSearch(query),
      INVESTMENT_SEARCH_DEBOUNCE_MS,
    );
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, searchable, focused, runSearch]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (blurRef.current) {
        clearTimeout(blurRef.current);
      }
    },
    [],
  );

  const closeDropdown = useCallback(() => {
    setStatus('idle');
    setResults([]);
  }, []);

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

  function handleSelect(item: MutualFundSearchResult) {
    suppressRef.current = true;
    hapticLight();
    onSelectResult(item.schemeName, item.schemeCode);
    closeDropdown();
    if (blurRef.current) {
      clearTimeout(blurRef.current);
    }
    setFocused(false);
    inputRef.current?.blur();
  }

  /** No result fit — let the user keep the typed text as a manual name. */
  function handleAddCustom() {
    closeDropdown();
    if (blurRef.current) {
      clearTimeout(blurRef.current);
    }
    setFocused(false);
    inputRef.current?.blur();
  }

  const showDropdown = searchable && focused && status !== 'idle';

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.inputRow,
          disabled && styles.inputRowDisabled,
          focused && styles.inputRowFocused,
        ]}>
        {searchable ? (
          <IconSearch size={18} color={focused ? colors.mint600 : colors.ink400} />
        ) : null}
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          placeholder={getInvestmentNamePlaceholder(investmentType)}
          placeholderTextColor={colors.ink400}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType={searchable ? 'search' : 'done'}
        />
        {value.length > 0 && !disabled ? (
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
          {status === 'loading' ? (
            <LoadingState />
          ) : status === 'error' ? (
            <ErrorState
              onRetry={() => runSearch(value.trim())}
              onAddCustom={handleAddCustom}
            />
          ) : status === 'empty' ? (
            <EmptyState onAddCustom={handleAddCustom} />
          ) : (
            <FlatList
              data={results}
              keyExtractor={item => String(item.schemeCode)}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              removeClippedSubviews
              initialNumToRender={8}
              maxToRenderPerBatch={10}
              windowSize={5}
              ItemSeparatorComponent={Separator}
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
  item: MutualFundSearchResult;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{color: colors.mint100}}
      style={({pressed}) => [
        styles.resultRow,
        pressed && Platform.OS === 'ios' && styles.resultRowPressed,
      ]}>
      <View style={styles.resultBody}>
        <AppText style={styles.resultName} numberOfLines={2}>
          {item.schemeName}
        </AppText>
        <AppText variant="xs" muted style={styles.resultCode}>
          {item.schemeCode}
        </AppText>
      </View>
      <IconChevronRight size={16} color={colors.ink400} />
    </Pressable>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

function LoadingState() {
  return (
    <View style={styles.stateBox}>
      <View style={styles.loadingHeader}>
        <ActivityIndicator size="small" color={colors.mint600} />
        <AppText variant="sm" muted style={styles.loadingText}>
          Searching funds…
        </AppText>
      </View>
      {[0, 1, 2].map(i => (
        <View key={i} style={styles.skeletonRow}>
          <View style={[styles.skeletonBar, styles.skeletonBarWide]} />
          <View style={[styles.skeletonBar, styles.skeletonBarNarrow]} />
        </View>
      ))}
    </View>
  );
}

function EmptyState({onAddCustom}: {onAddCustom: () => void}) {
  return (
    <View style={styles.stateBox}>
      <AppText style={styles.stateTitle}>No funds found</AppText>
      <AppText variant="xs" muted style={styles.stateHint}>
        Can’t find your investment?
      </AppText>
      <AddCustomButton onPress={onAddCustom} />
    </View>
  );
}

function ErrorState({
  onRetry,
  onAddCustom,
}: {
  onRetry: () => void;
  onAddCustom: () => void;
}) {
  return (
    <View style={styles.stateBox}>
      <AppText style={styles.stateTitle}>Unable to load results</AppText>
      <View style={styles.errorActions}>
        <Pressable
          onPress={onRetry}
          android_ripple={{color: colors.mint100}}
          style={({pressed}) => [
            styles.retryBtn,
            pressed && Platform.OS === 'ios' && styles.resultRowPressed,
          ]}>
          <AppText style={styles.retryText}>Retry</AppText>
        </Pressable>
        <AddCustomButton onPress={onAddCustom} />
      </View>
    </View>
  );
}

function AddCustomButton({onPress}: {onPress: () => void}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{color: colors.mint100}}
      style={({pressed}) => [
        styles.addCustomBtn,
        pressed && Platform.OS === 'ios' && styles.resultRowPressed,
      ]}>
      <IconPlus size={16} color={colors.mint700} />
      <AppText style={styles.addCustomText}>Add Custom Investment</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // High zIndex so the dropdown overlays the fields below it.
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
  inputRowDisabled: {backgroundColor: colors.canvas2, opacity: 0.7},
  input: {flex: 1, fontSize: 16, color: colors.ink900, padding: 0},
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 6,
    maxHeight: 300,
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.paper,
  },
  resultRowPressed: {backgroundColor: colors.mint50},
  resultBody: {flex: 1, gap: 2},
  resultName: {fontSize: 14, fontWeight: '700', color: colors.ink900},
  resultCode: {color: colors.ink500, fontVariant: ['tabular-nums']},
  separator: {height: 1, backgroundColor: colors.lineSoft, marginHorizontal: 14},
  stateBox: {padding: 14, gap: 8},
  loadingHeader: {flexDirection: 'row', alignItems: 'center', gap: 8},
  loadingText: {color: colors.ink500},
  skeletonRow: {gap: 6},
  skeletonBar: {height: 10, borderRadius: 5, backgroundColor: colors.canvas2},
  skeletonBarWide: {width: '85%'},
  skeletonBarNarrow: {width: '40%'},
  stateTitle: {fontSize: 14, fontWeight: '700', color: colors.ink900},
  stateHint: {color: colors.ink500},
  errorActions: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  retryText: {fontWeight: '700', color: colors.ink700, fontSize: 13},
  addCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.mint50,
  },
  addCustomText: {fontWeight: '700', color: colors.mint700, fontSize: 13},
});
