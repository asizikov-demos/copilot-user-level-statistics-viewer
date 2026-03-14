/**
 * Strict event handler types for improved type safety.
 * These types provide better IntelliSense and prevent runtime errors.
 */

import React from 'react';

// Mouse event handlers
export type ButtonClickHandler = (event: React.MouseEvent<HTMLButtonElement>) => void;
export type DivClickHandler = (event: React.MouseEvent<HTMLDivElement>) => void;
export type LinkClickHandler = (event: React.MouseEvent<HTMLAnchorElement>) => void;
export type GenericClickHandler<T extends HTMLElement = HTMLElement> = (event: React.MouseEvent<T>) => void;

// Keyboard event handlers
export type ButtonKeyHandler = (event: React.KeyboardEvent<HTMLButtonElement>) => void;
export type InputKeyHandler = (event: React.KeyboardEvent<HTMLInputElement>) => void;
export type GenericKeyHandler<T extends HTMLElement = HTMLElement> = (event: React.KeyboardEvent<T>) => void;

// Form event handlers
export type InputChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => void;
export type SelectChangeHandler = (event: React.ChangeEvent<HTMLSelectElement>) => void;
export type TextAreaChangeHandler = (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
export type FormSubmitHandler = (event: React.FormEvent<HTMLFormElement>) => void;

// Focus event handlers
export type InputFocusHandler = (event: React.FocusEvent<HTMLInputElement>) => void;
export type InputBlurHandler = (event: React.FocusEvent<HTMLInputElement>) => void;
export type GenericFocusHandler<T extends HTMLElement = HTMLElement> = (event: React.FocusEvent<T>) => void;

// Drag event handlers
export type DragEventHandler<T extends HTMLElement = HTMLElement> = (event: React.DragEvent<T>) => void;
export type DropHandler = DragEventHandler<HTMLDivElement>;

// Touch event handlers
export type TouchHandler<T extends HTMLElement = HTMLElement> = (event: React.TouchEvent<T>) => void;

// Combined mouse and keyboard handler for accessibility
export type InteractiveHandler = ButtonClickHandler | ButtonKeyHandler;

// Callback types (no event, just value)
export type ValueCallback<T> = (value: T) => void;
export type VoidCallback = () => void;

// Navigation callbacks
export type NavigationCallback = VoidCallback;
export type BackNavigationCallback = VoidCallback;

// Selection callbacks
export type SelectionCallback<T> = ValueCallback<T>;
export type MultiSelectionCallback<T> = ValueCallback<T[]>;

// Filter callbacks
export type FilterCallback<T> = ValueCallback<T>;
export type BooleanFilterCallback = ValueCallback<boolean>;

import type { SortDirection } from './sort';

// Sort callbacks
export type SortCallback<T extends string> = ValueCallback<T>;
export type SortDirectionCallback = ValueCallback<SortDirection>;

// Toggle callbacks
export type ToggleCallback = (expanded: boolean) => void;
