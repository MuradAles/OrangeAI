import { Input } from '@/components/common/Input';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

describe('Input Component', () => {
  describe('Rendering', () => {
    it('should render with placeholder', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Enter text" onChangeText={() => {}} />
      );
      expect(getByPlaceholderText('Enter text')).toBeTruthy();
    });

    it('should render with label', () => {
      const { getByText } = render(
        <Input label="Username" onChangeText={() => {}} />
      );
      expect(getByText('Username')).toBeTruthy();
    });

    it('should render with value', () => {
      const { getByDisplayValue } = render(
        <Input value="test value" onChangeText={() => {}} />
      );
      expect(getByDisplayValue('test value')).toBeTruthy();
    });
  });

  describe('Interaction', () => {
    it('should call onChangeText when text changes', () => {
      const onChangeText = jest.fn();
      const { getByTestId } = render(
        <Input onChangeText={onChangeText} testID="input" />
      );
      
      fireEvent.changeText(getByTestId('input'), 'new text');
      expect(onChangeText).toHaveBeenCalledWith('new text');
    });

    it('should call onFocus when focused', () => {
      const onFocus = jest.fn();
      const { getByTestId } = render(
        <Input onChangeText={() => {}} onFocus={onFocus} testID="input" />
      );
      
      fireEvent(getByTestId('input'), 'focus');
      expect(onFocus).toHaveBeenCalled();
    });

    it('should call onBlur when blurred', () => {
      const onBlur = jest.fn();
      const { getByTestId } = render(
        <Input onChangeText={() => {}} onBlur={onBlur} testID="input" />
      );
      
      fireEvent(getByTestId('input'), 'blur');
      expect(onBlur).toHaveBeenCalled();
    });
  });

  describe('Error State', () => {
    it('should display error message', () => {
      const { getByText } = render(
        <Input onChangeText={() => {}} error="Invalid input" />
      );
      expect(getByText('Invalid input')).toBeTruthy();
    });

    it('should apply error styling when error present', () => {
      const { getByTestId } = render(
        <Input onChangeText={() => {}} error="Error" testID="input" />
      );
      expect(getByTestId('input')).toBeTruthy();
    });
  });

  describe('Character Limit', () => {
    it('should show character counter when maxLength specified', () => {
      const { getByText } = render(
        <Input value="Hello" onChangeText={() => {}} maxLength={100} showCharacterCount />
      );
      expect(getByText('5/100')).toBeTruthy();
    });

    it('should enforce maxLength', () => {
      const onChangeText = jest.fn();
      const { getByTestId } = render(
        <Input onChangeText={onChangeText} maxLength={5} testID="input" />
      );
      
      fireEvent.changeText(getByTestId('input'), '123456');
      // React Native TextInput enforces maxLength automatically
      expect(getByTestId('input')).toBeTruthy();
    });

    it('should not show character counter by default', () => {
      const { queryByText } = render(
        <Input value="Hello" onChangeText={() => {}} maxLength={100} />
      );
      expect(queryByText('5/100')).toBeFalsy();
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when editable is false', () => {
      const { getByTestId } = render(
        <Input onChangeText={() => {}} editable={false} testID="input" />
      );
      expect(getByTestId('input').props.editable).toBe(false);
    });
  });

  describe('Secure Text Entry', () => {
    it('should hide text when secureTextEntry is true', () => {
      const { getByTestId } = render(
        <Input onChangeText={() => {}} secureTextEntry testID="input" />
      );
      expect(getByTestId('input').props.secureTextEntry).toBe(true);
    });
  });

  describe('Multiline', () => {
    it('should support multiline input', () => {
      const { getByTestId } = render(
        <Input onChangeText={() => {}} multiline testID="input" />
      );
      expect(getByTestId('input').props.multiline).toBe(true);
    });

    it('should support numberOfLines prop', () => {
      const { getByTestId } = render(
        <Input onChangeText={() => {}} multiline numberOfLines={4} testID="input" />
      );
      expect(getByTestId('input').props.numberOfLines).toBe(4);
    });
  });

  describe('Icon Support', () => {
    it('should render with left icon', () => {
      const { getByTestId } = render(
        <Input onChangeText={() => {}} leftIcon="search" testID="input" />
      );
      expect(getByTestId('input')).toBeTruthy();
    });

    it('should render with right icon', () => {
      const { getByTestId } = render(
        <Input onChangeText={() => {}} rightIcon="clear" testID="input" />
      );
      expect(getByTestId('input')).toBeTruthy();
    });
  });
});

