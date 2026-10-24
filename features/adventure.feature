Feature: Playing it as a text adventure

  The reader types at a prompt. Streets here are invented.

  Background:
    Given an invented street called "Long Street" running east from "Short Row" to "Blind Alley"
    And a pub called "The Sextant" beside Long Street
    And the reader starts part way along Long Street

  Scenario: The reader is told where they stand
    When the game begins
    Then it says "You are standing on Long Street, between Short Row and Blind Alley."

  Scenario: Exits say where they lead
    When the game begins
    Then it says "east (Long Street, towards Blind Alley)"

  Scenario: Walking by typing a direction
    When the reader types "e"
    Then the reader has moved east

  Scenario: Walking back the way they came
    When the reader types "go east"
    And the reader types "back"
    Then the reader is where they started

  Scenario: A way that isn't there
    When the reader types "go north"
    Then it says "You can’t go north from here."

  Scenario: Examining something in view
    When the reader types "x sextant"
    Then it says "amenity=pub"

  Scenario: Something not in view
    When the reader types "examine the cathedral"
    Then it says "You see no cathedral here."
