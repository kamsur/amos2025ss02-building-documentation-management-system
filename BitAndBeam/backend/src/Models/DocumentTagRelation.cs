namespace BitAndBeam.Models
{
    public class DocumentTagRelation
    {
        public int DocumentId { get; set; }
        public Document Document { get; set; }

        public int TagId { get; set; }
        public DocumentTag Tag { get; set; }
    }
}
//Check OK: This Table can be deleted in the database. 

