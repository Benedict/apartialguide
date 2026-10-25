Feature: What belongs to the street underfoot

  Guide tells what is on the street the reader stands on. Something addressed to another street
  is told only when it is right beside the reader. Streets and addresses here are invented.

  Background:
    Given an invented street called "Long Street" running east from "Short Row" to "Blind Alley"
    And the reader starts part way along Long Street

  Scenario: Something addressed to another street is told only right beside the reader
    Given a house at "3 Other Road" 20 metres north of the reader
    And a house at "5 Far Road" 8 metres south of the reader
    When the game begins
    Then it does not say "Other Road"
    And it says "5 Far Road"

  Scenario: Something addressed to the street underfoot is told from further off
    Given a house at "7 Long Street" 20 metres north of the reader
    When the game begins
    Then it says "7 Long Street"
