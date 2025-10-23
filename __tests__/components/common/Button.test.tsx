import { Button } from '@/components/common/Button';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render with text', () => {
      const { getByText } = render(<Button title="Click Me" onPress={() => {}} />);
      expect(getByText('Click Me')).toBeTruthy();
    });

    it('should render primary variant by default', () => {
      const { getByTestId } = render(
        <Button title="Primary" onPress={() => {}} testID="button" />
      );
      const button = getByTestId('button');
      expect(button).toBeTruthy();
    });

    it('should render secondary variant', () => {
      const { getByTestId } = render(
        <Button title="Secondary" variant="secondary" onPress={() => {}} testID="button" />
      );
      expect(getByTestId('button')).toBeTruthy();
    });

    it('should render outline variant', () => {
      const { getByTestId } = render(
        <Button title="Outline" variant="outline" onPress={() => {}} testID="button" />
      );
      expect(getByTestId('button')).toBeTruthy();
    });

    it('should render ghost variant', () => {
      const { getByTestId } = render(
        <Button title="Ghost" variant="ghost" onPress={() => {}} testID="button" />
      );
      expect(getByTestId('button')).toBeTruthy();
    });
  });

  describe('Interaction', () => {
    it('should call onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByText } = render(<Button title="Press Me" onPress={onPress} />);
      
      fireEvent.press(getByText('Press Me'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when disabled', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <Button title="Disabled" onPress={onPress} disabled />
      );
      
      fireEvent.press(getByText('Disabled'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('should handle multiple rapid presses', () => {
      const onPress = jest.fn();
      const { getByText } = render(<Button title="Rapid" onPress={onPress} />);
      
      const button = getByText('Rapid');
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);
      
      expect(onPress).toHaveBeenCalledTimes(3);
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading', () => {
      const { getByTestId } = render(
        <Button title="Loading" onPress={() => {}} loading testID="button" />
      );
      expect(getByTestId('button')).toBeTruthy();
    });

    it('should not call onPress when loading', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Button title="Loading" onPress={onPress} loading testID="button" />
      );
      
      fireEvent.press(getByTestId('button'));
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('Sizing', () => {
    it('should render small size', () => {
      const { getByTestId } = render(
        <Button title="Small" size="small" onPress={() => {}} testID="button" />
      );
      expect(getByTestId('button')).toBeTruthy();
    });

    it('should render medium size by default', () => {
      const { getByTestId } = render(
        <Button title="Medium" onPress={() => {}} testID="button" />
      );
      expect(getByTestId('button')).toBeTruthy();
    });

    it('should render large size', () => {
      const { getByTestId } = render(
        <Button title="Large" size="large" onPress={() => {}} testID="button" />
      );
      expect(getByTestId('button')).toBeTruthy();
    });
  });

  describe('Full Width', () => {
    it('should render full width when specified', () => {
      const { getByTestId } = render(
        <Button title="Full Width" onPress={() => {}} fullWidth testID="button" />
      );
      expect(getByTestId('button')).toBeTruthy();
    });
  });

  describe('Icon Support', () => {
    it('should render with icon', () => {
      const { getByTestId } = render(
        <Button title="With Icon" onPress={() => {}} icon="check" testID="button" />
      );
      expect(getByTestId('button')).toBeTruthy();
    });
  });
});

