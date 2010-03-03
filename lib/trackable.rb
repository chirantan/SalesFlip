module Trackable
  def self.included( base )
    base.class_eval do
      key :tracker_ids, Array
      named_scope :tracked_by, lambda { |user| { :conditions => { :tracker_ids => user.id } } }
    end
    base.send(:include, InstanceMethods)
  end

  module InstanceMethods
    def trackers
      User.scoped(:conditions => { :id => tracker_ids })
    end

    def tracked_by?( user )
      trackers.include?(user)
    end

    def tracker_ids=( ids )
      self[:tracker_ids] = ids.map { |id| Mongo::ObjectID.from_string(id.to_s) } if ids
    end

    def remove_tracker_ids=( ids )
      ids = ids.map { |id| Mongo::ObjectID.from_string(id.to_s) }
      self[:tracker_ids] = (self.tracker_ids - ids).map do |id|
        Mongo::ObjectID.from_string(id.to_s)
      end
    end
  end
end
