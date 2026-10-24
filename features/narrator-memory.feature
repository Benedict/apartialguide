@later
Feature: Narrator memory

  Arrives with live mode, when the narrator keeps what it read on earlier visits.

  Scenario: A change between visits reads as memory loss
    Given the narrator read "est Bank" at 209-213 on its last visit
    And the live map no longer carries that old_name
    When the reader returns to 209-213
    Then the narration expresses that something it knew is gone
