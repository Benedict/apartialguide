Feature: Choosing where to begin

  Guide introduces themselves, then asks where the reader would like to begin.
  Places are looked up in the map Guide carries, never anywhere else.
  Streets, places and postcodes here are invented.

  Background:
    Given an invented street called "Long Street" running east from "Short Row" to "Blind Alley"
    And a pub called "The Sextant" beside Long Street
    And a house with the postcode "ZZ1 1ZZ" at the east end of Long Street
    And the reader opens the game

  Scenario: Guide introduces themselves
    Then it says "I am Guide. I lived here a long time ago, yesterday, and tomorrow."
    And it says "Where would you like to begin?"
    And it does not say "You are standing"

  Scenario: Beginning on a street
    When the reader types "short row"
    Then it says "You are standing"
    And it says "Short Row"

  Scenario: Beginning at a place
    When the reader types "sextant"
    Then it says "You are standing on Long Street"

  Scenario: Beginning at a postcode, however it is typed
    When the reader types "zz11zz"
    Then it says "Blind Alley"

  Scenario: Somewhere the map does not have
    When the reader types "Atlantis"
    Then it says "I have no record of “Atlantis”."
    And it does not say "You are standing"

  Scenario: Beginning where the reader is
    When the reader types "here"
    Then the game asks where the reader is
    When the reader is found beside The Sextant
    Then it says "You are standing on Long Street"

  Scenario: The reader is somewhere far off the map
    When the reader is found 5 kilometres north of Long Street
    Then it says "That is not on my map."

  Scenario: Leaving it to Guide
    When the reader types "anywhere"
    Then it says "You are standing"

  Scenario: Once begun, the introduction is not repeated
    When the reader types "short row"
    And the reader types "look"
    Then it does not say "I am Guide"
