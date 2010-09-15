# Base class including this module should oveeride follwoing methods to change default behavior.
# 1) google_account - Returns a GoogleAccount class instance
# 2) build_params_for_gc - Builds a hash of params for creating/updating google calendar event.

module GoogleCalendarSync
  include GCal4Ruby

  CALENDAR_NAME = 'SalesFlip CRM'

  def self.included(base)
    base.send(:after_create, :create_event_on_google_calendar)
    base.send(:after_update, :update_event_on_google_calendar)
    base.send(:after_destroy, :destroy_event_from_google_calendar)
  end

  def create_event_on_google_calendar
    if service
      event = Event.new(service)
      if save_google_calendar_event(event)
        update_attributes :google_calendar_event_id => event.id
      end
    end
  end

  def update_event_on_google_calendar
    if service
      event = google_calendar_event
      save_google_calendar_event(event) if event
    end
  end

  def destroy_event_from_google_calendar
    if service
      event = google_calendar_event
      event && event.delete
    end
  end

  # Support methods

  def exists_on_google_calendar?
    !google_calendar_event.blank?
  end

  def google_calendar_event(gcal_id = nil)
    if google_calendar_event_id || gcal_id
      @google_calendar_event =
        begin
        Event.find(service, {:id => (google_calendar_event_id || gcal_id)})
      rescue GData4Ruby::HTTPRequestFailed
        false
      end
    end
  end

  private
  def build_params_for_gc(event)
    event.calendar = calendar
    event.title = name
    event.start_time = due_at
    event.end_time = completed_at || (due_at + 1.hour)
    event.where = CALENDAR_NAME
    event
  end

  def save_google_calendar_event(event)
    event = build_params_for_gc(event)
    event.save
  end

  def service
    @service ||=
      if google_account
      service = Service.new
      service.authenticate(google_account.email, google_account.password)
      service
    end
  end

  def google_account
    user.google_account
  end

  def calendar
    if service
      @calendar ||= (
        calendar = Calendar.find(service, {:title => CALENDAR_NAME})
        if calendar.empty?
          calendar = Calendar.new(service, {:title => CALENDAR_NAME})
          calendar.save
        else
          calendar.first
        end
      )
    end
  end

end
