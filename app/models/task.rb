class Task
  include MongoMapper::Document
  include HasConstant

  key :user_id,         ObjectId, :required => true, :index => true
  key :name,            String, :required => true
  key :due_at,          Time
  key :assignee_id,     ObjectId, :index => true
  key :category,        Integer, :required => true, :index => true
  key :completed_by_id, ObjectId, :index => true
  key :asset_id,        ObjectId, :index => true
  key :asset_type,      String, :index => true
  key :priority,        Integer
  key :completed_at,    Time
  key :deleted_at,      Time

  has_constant :categories, lambda { I18n.t(:task_categories) }

  belongs_to :user
  belongs_to :asset, :polymorphic => true
  belongs_to :assignee, :class_name => 'User'
  belongs_to :completed_by, :class_name => 'User'

  named_scope :incomplete, :conditions => { :completed_at => nil }
  named_scope :due_today, lambda { { :conditions => { :due_at => { '$lt' => Time.zone.now.tomorrow.midnight } } } }

  after_save :notify_assignee

  def self.daily_email
    Task.due_today.group_by(&:user).each do |user, tasks|
      TaskMailer.deliver_daily_task_summary(user, tasks)
    end
  end

  def completed_by_id=( user_id )
    if user_id and not completed?
      self[:completed_at] = Time.zone.now
      self[:completed_by_id] = user_id
    end
  end

  def completed?
    completed_at
  end

  def assignee_id=( assignee_id )
    if assignee_id and assignee_id != self.assignee_id
      @reassigned = true
      self[:assignee_id] = assignee_id
    end
  end

  # - 1.second thing is because for some reason 1 second is being added to all end_of... times
  # I think this is to do with mongo UTC times but not entirely sure
  def due_at=( due )
    self[:due_at] =
      case due
      when 'overdue'
        Time.zone.now.yesterday.end_of_day - 1.second
      when 'due_today'
        Time.zone.now.end_of_day - 1.second
      when 'due_tomorrow'
        Time.zone.now.tomorrow.end_of_day - 1.second
      when 'due_this_week'
        Time.zone.now.end_of_week - 1.second
      when 'due_next_week'
        Time.zone.now.next_week.end_of_week - 1.second
      when 'due_later'
        (Time.zone.now.end_of_day - 1.second) + 5.years
      else
        due
      end
  end

  def due_at_in_words
    if self.due_at && self.due_at.strftime("%H:%M:%S") == '23:59:59'
      case
      when self.due_at.to_i < Time.zone.now.midnight.to_i
        'overdue'
      when self.due_at.to_i == Time.zone.now.end_of_day.to_i
        'due_today'
      when self.due_at.to_i == Time.zone.now.tomorrow.end_of_day.to_i
        'due_tomorrow'
      when self.due_at.to_i >= (Time.zone.now.tomorrow.end_of_day + 1.day).to_i && self.due_at.to_i <= Time.zone.now.end_of_week.to_i
        'due_this_week'
      when self.due_at.to_i >= Time.zone.now.next_week.beginning_of_week.to_i && self.due_at.to_i <= Time.zone.now.next_week.end_of_week.to_i
        'due_next_week'
      when self.due_at.to_i > Time.zone.now.next_week.end_of_week.to_i
        'due_later'
      end
    elsif self.due_at
      self.due_at.to_s :short
    else
      nil
    end
  end

  def notify_assignee
    TaskMailer.deliver_assignment_notification(self) if @reassigned
  end
end