import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import {PrivacyPolicyBody} from '@/components/legal/privacy-policy-body';
import {PrivacyConsentCheckbox} from '@/components/legal/privacy-consent-checkbox';
import {BUNDLED_PRIVACY_POLICY} from '@pfos/shared';

jest.mock('@/components/icons', () => ({
  IconShield: () => null,
}));

describe('PrivacyPolicyBody', () => {
  it('renders required policy sections', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <PrivacyPolicyBody policy={BUNDLED_PRIVACY_POLICY} />,
      );
    });

    const text = JSON.stringify(tree!.toJSON());
    expect(text).toContain('Information We Collect');
    expect(text).toContain('Contact Information');
    expect(text).toContain(BUNDLED_PRIVACY_POLICY.contactEmail);
  });
});

describe('PrivacyConsentCheckbox', () => {
  it('calls onChange when pressed', () => {
    const onChange = jest.fn();
    let tree: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <PrivacyConsentCheckbox
          checked={false}
          onChange={onChange}
          onOpenPolicy={jest.fn()}
        />,
      );
    });

    const pressable = tree!.root.findByProps({accessibilityRole: 'checkbox'});
    ReactTestRenderer.act(() => {
      pressable.props.onPress();
    });

    expect(onChange).toHaveBeenCalledWith(true);
  });
});
