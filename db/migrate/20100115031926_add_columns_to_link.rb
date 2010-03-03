class AddColumnsToLink < ActiveRecord::Migration
  def self.up
    add_column :links, :resource, :string
    add_column :links, :target_id, :integer
  end

  def self.down
    remove_column :links, :target_id
    remove_column :links, :resource
  end
end
