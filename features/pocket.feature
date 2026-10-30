Feature: Fragments Guide carries

  Guide keeps the broken names it speaks, and now and then one comes back, out of place,
  as if it still meant something. It never says where it came from, and never repairs it.
  Streets and names here are invented.

  Background:
    Given an invented street called "Long Street" running 600 metres east from "Short Row" to "Blind Alley"
    And a building once called "ld Invented Mill" at the west end of Long Street
    And the reader opens the game

  Scenario: A collected fragment returns out of place
    Given chance favours memory
    When the reader types "take the tour"
    And the reader walks east 4 times
    Then it says "“ld Invented Mill”"
    And what it says of “ld Invented Mill” gives no street and no number

  Scenario: Without chance, nothing comes back
    Given chance does not favour memory
    When the reader types "take the tour"
    And the reader walks east 4 times
    Then it does not say "ld Invented Mill"

  Scenario: A fragment comes back once at most
    Given chance favours memory
    When the reader types "take the tour"
    And the reader walks east 4 times
    And the reader walks west 1 time
    Then it does not say "ld Invented Mill"
