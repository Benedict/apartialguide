Feature: The weather on the days that were recorded

  The weather of a day the map remembers: when something was last recorded, when it went,
  when the map was made. And today's, as the reader reads. Weather here is invented.

  Background:
    Given an invented street called "Long Street" running east from "Short Row" to "Blind Alley"
    And a pub called "The Sextant" beside Long Street
    And the reader starts part way along Long Street

  Scenario: Something gone is remembered with the weather of its last day on the map
    Given the map of 2017-01-01 had a bakery called "Crumb" right beside the reader
    And the weather on 2017-01-01 was overcast, 2 to 5 °C
    When the game begins
    Then it says "there was a bakery"
    And it says "Overcast that day, 2 to 5 °C."

  Scenario: Guide knows the weather the day the map was made
    Given the weather on 2026-10-24 was light rain, 9 to 13 °C
    When the reader opens the game
    Then it says "The map I carry is dated 24 October 2026. Light rain that day, 9 to 13 °C."

  Scenario: Without a record of the weather, Guide says nothing of it
    Given the map of 2017-01-01 had a bakery called "Crumb" right beside the reader
    When the game begins
    Then it does not say "that day"

  Scenario: Guide knows today's weather, as the reader reads
    Given the weather on 2026-10-24 was light rain, 9 to 13 °C
    And the weather now is overcast, 12 °C
    When the reader opens the game
    Then it says "Light rain that day, 9 to 13 °C. Today: overcast, 12 °C."

  Scenario: The reader asks after the weather
    Given the weather now is overcast, 12 °C
    And the reader opens the game
    When the reader types "take the tour"
    And the reader types "weather"
    Then it says "Today: overcast, 12 °C."
