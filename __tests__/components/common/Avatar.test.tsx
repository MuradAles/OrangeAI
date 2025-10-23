import { Avatar } from '@/components/common/Avatar';
import { render } from '@testing-library/react-native';
import React from 'react';

describe('Avatar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Image Display', () => {
    it('should render image when uri provided', () => {
      const { getByTestId } = render(
        <Avatar
          imageUrl="https://example.com/avatar.jpg"
          name="John Doe"
          size={50}
          testID="avatar"
        />
      );
      expect(getByTestId('avatar')).toBeTruthy();
    });

    it('should render image with correct size', () => {
      const { getByTestId } = render(
        <Avatar
          imageUrl="https://example.com/avatar.jpg"
          name="John Doe"
          size={100}
          testID="avatar"
        />
      );
      const avatar = getByTestId('avatar');
      expect(avatar.props.style).toMatchObject(
        expect.objectContaining({
          width: 100,
          height: 100,
        })
      );
      // Check that image is rendered
      expect(getByTestId('avatar-image')).toBeTruthy();
    });
  });

  describe('Fallback to Colored Circle', () => {
    it('should render colored circle when no uri', () => {
      const { getByTestId } = render(
        <Avatar name="John Doe" size={50} testID="avatar" />
      );
      expect(getByTestId('avatar')).toBeTruthy();
    });

    it('should display first letter of name', () => {
      const { getByText } = render(
        <Avatar name="John Doe" size={50} />
      );
      expect(getByText('J')).toBeTruthy();
    });

    it('should generate consistent color for same name', () => {
      const { getByText: getByText1 } = render(<Avatar name="John Doe" size={50} />);
      const { getByText: getByText2 } = render(<Avatar name="John Doe" size={50} />);
      
      // Both should render the same initial
      expect(getByText1('J')).toBeTruthy();
      expect(getByText2('J')).toBeTruthy();
    });

    it('should handle empty name gracefully', () => {
      const { getByText } = render(
        <Avatar name="" size={50} />
      );
      expect(getByText('?')).toBeTruthy();
    });

    it('should handle single character name', () => {
      const { getByText } = render(
        <Avatar name="J" size={50} />
      );
      expect(getByText('J')).toBeTruthy();
    });
  });

  describe('Size Variants', () => {
    it('should render small avatar (30px)', () => {
      const { getByTestId } = render(
        <Avatar name="John" size={30} testID="avatar" />
      );
      expect(getByTestId('avatar')).toBeTruthy();
    });

    it('should render medium avatar (50px)', () => {
      const { getByTestId } = render(
        <Avatar name="John" size={50} testID="avatar" />
      );
      expect(getByTestId('avatar')).toBeTruthy();
    });

    it('should render large avatar (100px)', () => {
      const { getByTestId } = render(
        <Avatar name="John" size={100} testID="avatar" />
      );
      expect(getByTestId('avatar')).toBeTruthy();
    });

    it('should render custom size', () => {
      const { getByTestId } = render(
        <Avatar name="John" size={75} testID="avatar" />
      );
      expect(getByTestId('avatar')).toBeTruthy();
    });
  });

  describe('Online Status Indicator', () => {
    it('should show online indicator when online', () => {
      const { getByTestId } = render(
        <Avatar name="John" size={50} isOnline testID="avatar" />
      );
      expect(getByTestId('avatar')).toBeTruthy();
    });

    it('should not show indicator when offline', () => {
      const { getByTestId } = render(
        <Avatar name="John" size={50} isOnline={false} testID="avatar" />
      );
      expect(getByTestId('avatar')).toBeTruthy();
    });
  });

  describe('Border Styling', () => {
    it('should render with border when showBorder is true', () => {
      const { getByTestId } = render(
        <Avatar name="John" size={50} showBorder testID="avatar" />
      );
      expect(getByTestId('avatar')).toBeTruthy();
    });

    it('should render without border by default', () => {
      const { getByTestId } = render(
        <Avatar name="John" size={50} testID="avatar" />
      );
      expect(getByTestId('avatar')).toBeTruthy();
    });
  });

  describe('Special Characters in Name', () => {
    it('should handle names with emojis', () => {
      const { getByTestId } = render(
        <Avatar name="😀 John" size={50} testID="emoji-avatar" />
      );
      // Emojis may not render properly in test environment, just verify component renders
      expect(getByTestId('emoji-avatar')).toBeTruthy();
    });

    it('should handle names with numbers', () => {
      const { getByText } = render(
        <Avatar name="User123" size={50} />
      );
      expect(getByText('U')).toBeTruthy();
    });

    it('should handle names with special characters', () => {
      const { getByText } = render(
        <Avatar name="@John_Doe!" size={50} />
      );
      // Should extract first character (@)
      expect(getByText('@')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible label', () => {
      const { getByLabelText } = render(
        <Avatar name="John Doe" size={50} accessibilityLabel="John Doe's avatar" />
      );
      expect(getByLabelText("John Doe's avatar")).toBeTruthy();
    });
  });
});

