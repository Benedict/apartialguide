Feature: The weather, as the reader reads

  Today's weather, asked for at the moment of play. Never a past day's: the map is dated,
  the sky is not. Weather here is invented.

  Background:
    Given an invented street called "Long Street" running east from "Short Row" to "Blind Alley"
    And a pub called "The Sextant" beside Long Street
    And the reader starts part way along Long Street

  Scenario: Guide knows today's weather, after the map's date
    Given the weather now is overcast, 12 °C
    When the reader opens the game
    Then it says "The map I carry is dated 24 October 2026"
    And it says "Today: overcast, 12 °C."

  Scenario: The reader asks after the weather
    Given the weather now is overcast, 12 °C
    And the reader opens the game
    When the reader types "take the tour"
    And the reader types "weather"
    Then it says "Today: overcast, 12 °C."

  Scenario: Without word of today, Guide says nothing of the weather
    When the reader opens the game
    Then it does not say "Today:"

  Scenario: What has gone is remembered without a past day's weather
    Given the map of 2017-01-01 had a bakery called "Crumb" right beside the reader
    When the game begins
    Then it says "there was a bakery"
    And it does not say "that day"
