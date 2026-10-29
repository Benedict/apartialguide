Feature: Taking the tour

  Guide introduces themselves, then offers the tour.
  Streets and places here are invented.

  Background:
    Given an invented street called "Long Street" running east from "Short Row" to "Blind Alley"
    And a pub called "The Sextant" beside Long Street
    And the reader opens the game

  Scenario: Guide introduces themselves and offers the tour
    Then it says "I am Guide. I lived here long ago. I lived here yesterday. I will have lived here tomorrow."
    And it says "take the tour"
    And it does not say "You are standing"
    And it does not say "postcode"

  Scenario: Guide gives an account of the map they carry
    Then it says "I walk by a map. Mine is dated 24 October 2026: 3 named streets and"
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
    Then it does not say "I am Guide"
