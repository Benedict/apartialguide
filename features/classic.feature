Feature: A classic text adventure

  Guide keeps the old conventions: a place told in full once, then briefly; names to carry;
  and the distance walked as the score. Streets here are invented.

  Background:
    Given an invented street called "Long Street" running east from "Short Row" to "Blind Alley"
    And the reader starts part way along Long Street

  Scenario: A place returned to is told briefly, and in full on look
    When the reader types "e"
    And the reader types "e"
    And the reader types "w"
    Then it does not say "You are standing on"
    And it does not say "Further along"
    And it does not say "Still on"
    And it says "Exits:"
    When the reader types "look"
    Then it says "You are standing on Long Street"

  Scenario: Carrying nothing to begin with
    When the reader types "i"
    Then it says "You are carrying nothing."

  Scenario: The score is the distance walked
    When the reader types "e"
    And the reader types "score"
    Then it says "You have walked"
    And it says "in 1 move."

  Scenario: The screen takes a terminal's colours
    When the reader types "colour green"
    Then it says "The screen turns green."
    And the page is coloured "green"
    When the reader types "color paper"
    Then the page is coloured "paper"
    When the reader types "colour"
    Then it says "paper, green, amber or red"
    When the reader types "colour purple"
    Then it says "paper, green, amber or red"
    And the page keeps its colours
