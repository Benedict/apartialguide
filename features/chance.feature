Feature: Chance

  Guide may set two names from different places side by side when they share a real word.
  It never explains the connection, and it happens rarely: twice a walk at most.
  Streets and names here are invented.

  Background:
    Given an invented street called "Long Street" running 600 metres east from "Short Row" to "Quillon Row"
    And a pub called "The Quillon Arms" at the west end of Long Street
    And the reader opens the game

  Scenario: Two names that share a word, met in different places
    Given chance favours memory
    When the reader types "take the tour"
    And the reader walks east 4 times
    Then it says "“Quillon Row”. Earlier, “The Quillon Arms”."

  Scenario: Without chance, no connection
    Given chance does not favour memory
    When the reader types "take the tour"
    And the reader walks east 4 times
    Then it does not say "Earlier"
