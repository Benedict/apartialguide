Feature: Taking the tour

  Guide introduces themselves, then offers the tour.
  Streets and places here are invented.

  Background:
    Given an invented street called "Long Street" running east from "Short Row" to "Blind Alley"
    And a pub called "The Sextant" beside Long Street
    And the reader opens the game

  Scenario: Guide introduces themselves and offers the tour
    Then it says "Hello. I’m Guide. I’ll walk you"
    And it says "take the tour"
    And it does not say "You are standing"
    And it does not say "postcode"

  Scenario: Guide is honest about the map they carry
    Then it says "The map I carry is dated 24 October 2026. Some of it will be out of date, or wrong, or missing."
    And it does not say "named streets"

  Scenario: Asking what Guide carries
    When the reader types "take the tour"
    And the reader types "i"
    Then it says "I carry a map dated 24 October 2026: 3 named streets and"
    And it says "places to stand"

  Scenario: Taking the tour
    When the reader types "take the tour"
    Then it says "You are standing"

  Scenario: Anything else, before the tour
    When the reader types "north"
    Then it says "take the tour"
    And it does not say "You are standing"

  Scenario: Once begun, the introduction is not repeated
    When the reader types "take the tour"
    And the reader types "look"
    Then it does not say "I’m Guide"
