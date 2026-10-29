Feature: Prose written ahead of time

  A model writes each stop's description once, ahead of time. Here a recorded model stands in.
  Streets here are invented.

  Background:
    Given an invented street called "Long Street" running east from "Short Row" to "Blind Alley"
    And a pub called "The Sextant" beside Long Street
    And the reader starts part way along Long Street

  Scenario: Written prose is what the reader reads
    Given prose has been written ahead of time for every stop, reading "Long Street, and a pub."
    When the game begins
    Then it says "Long Street, and a pub."
    And it says "Exits: "
    And it does not say "You are standing on Long Street"

  Scenario: Written prose is what the reader reads on walking in
    Given prose has been written ahead of time for every stop, reading "Long Street, and a pub."
    When the reader types "e"
    Then it says "Long Street, and a pub."
    And it does not say "You are standing on Long Street"

  Scenario: A stop without written prose keeps the template
    When the game begins
    Then it says "You are standing on Long Street"
