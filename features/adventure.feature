Feature: Playing it as a text adventure

  The reader types at a prompt. Streets here are invented.

  Background:
    Given an invented street called "Long Street" running east from "Short Row" to "Blind Alley"
    And a pub called "The Sextant" beside Long Street
    And the reader starts part way along Long Street

  Scenario: Guide introduces themselves before the first place
    When the game begins
    Then it says "I am Guide. I lived here a long time ago, yesterday, and tomorrow."

  Scenario: Guide introduces themselves only once
    When the reader types "look"
    Then it does not say "I am Guide"

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

  Scenario: Things Guide hasn't noticed are found by exploring
    Given six benches right beside the reader
    When the game begins
    Then it does not say "The Sextant"
    When the reader types "explore"
    Then it says "Looking closer, you find"
    And it says "The Sextant, a pub"

  Scenario: Examining something unnoticed finds it
    Given six benches right beside the reader
    When the reader types "x sextant"
    Then it says "amenity=pub"

  Scenario: Nothing more to find
    When the reader types "search"
    Then it says "nothing more"
